// admin-remove-listing
// Lets an admin delete a listing on behalf of moderation and notify the
// seller by email. Verifies the caller is an admin via the is_admin()
// SQL helper, then service-role deletes the listing and fires a Resend
// email explaining the reason. All actions are recorded in audit_log.
//
// Required secrets:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//   RESEND_API_KEY                — your Resend API key
//   ADMIN_EMAIL_FROM              — verified sender, e.g. "MIDDLEMAN <support@middlemanmarketplace.com>"
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "missing authorization" }, 401);

    const { listing_id, reason, custom_message } = await req.json().catch(() => ({}));
    if (!listing_id) return json({ error: "listing_id required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    // Verify admin status via the SECURITY DEFINER helper. Using the
    // service-role client so RLS can't accidentally hide the profiles row.
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("id, full_name, is_admin")
      .eq("id", user.id)
      .single();
    if (!adminProfile?.is_admin) return json({ error: "forbidden — admin only" }, 403);

    // Look up the listing + seller email before deletion (we need both).
    const { data: listing, error: lookupErr } = await admin
      .from("listings")
      .select("id, title, seller_id")
      .eq("id", listing_id)
      .single();
    if (lookupErr || !listing) return json({ error: "listing not found" }, 404);

    const { data: seller } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", listing.seller_id)
      .single();

    // Delete the listing. RLS already permits admins to delete any listing,
    // but service-role is a defense-in-depth fallback if the policy is ever
    // tightened.
    const { error: delErr } = await admin
      .from("listings")
      .delete()
      .eq("id", listing.id);
    if (delErr) return json({ error: delErr.message }, 500);

    // Audit trail. Survives the listing's deletion because audit_log holds
    // its own copy of the payload.
    await admin.from("audit_log").insert({
      entity_type: "listing",
      entity_id: listing.id,
      actor_id: user.id,
      action: "removed_by_admin",
      payload: {
        title: listing.title,
        seller_id: listing.seller_id,
        seller_email: seller?.email || null,
        reason: reason || null,
        custom_message: custom_message || null,
      },
    });

    // Fire the notification email. Best-effort — if Resend errors we still
    // report success on the delete (which already happened).
    let emailSent = false;
    let emailError: string | null = null;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddress = Deno.env.get("ADMIN_EMAIL_FROM") ||
      "MIDDLEMAN <onboarding@resend.dev>";
    if (resendKey && seller?.email) {
      // Hard 10s timeout so a slow Resend response can't trap the user
      // staring at a "Removing…" spinner. The listing is already deleted
      // by this point — the email is best-effort.
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 10_000);
      try {
        console.log("[admin-remove-listing] sending email via Resend", {
          to: seller.email,
          from: fromAddress,
        });
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [seller.email],
            subject: `Your listing on MIDDLEMAN was removed`,
            html: buildEmailHtml({
              sellerName: seller.full_name || "there",
              listingTitle: listing.title,
              reason: reason || "Violation of our community guidelines",
              customMessage: custom_message || null,
            }),
          }),
          signal: ac.signal,
        });
        if (emailRes.ok) {
          emailSent = true;
          console.log("[admin-remove-listing] email sent OK");
        } else {
          const body = await emailRes.text();
          emailError = `Resend ${emailRes.status}: ${body}`;
          console.warn("[admin-remove-listing] email failed", emailError);
        }
      } catch (err) {
        const msg = (err as Error).name === "AbortError"
          ? "Resend request timed out after 10s"
          : (err as Error).message;
        emailError = msg;
        console.warn("[admin-remove-listing] email error", msg);
      } finally {
        clearTimeout(timer);
      }
    } else if (!resendKey) {
      emailError = "RESEND_API_KEY not set — skipping email";
    } else {
      emailError = "Seller has no email on file";
    }

    return json({
      success: true,
      listing_id: listing.id,
      seller_email: seller?.email || null,
      email_sent: emailSent,
      email_error: emailError,
    });
  } catch (err) {
    console.error("[admin-remove-listing]", err);
    return json({ error: (err as Error)?.message || "internal error" }, 500);
  }
});

function buildEmailHtml(p: {
  sellerName: string;
  listingTitle: string;
  reason: string;
  customMessage: string | null;
}): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const customBlock = p.customMessage
    ? `<p style="margin:16px 0 0; color:#3f3f3f; font-size:14px; line-height:1.6;">${escape(p.customMessage)}</p>`
    : "";
  return `
<!doctype html>
<html><body style="margin:0;background:#f7f7f7;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="color:#ff385c;font-weight:500;font-size:14px;letter-spacing:-0.012em;">MIDDLEMAN</div>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:500;letter-spacing:-0.012em;">Your listing was removed</h1>
          <p style="margin:0;color:#3f3f3f;font-size:14px;line-height:1.6;">
            Hi ${escape(p.sellerName)},
          </p>
          <p style="margin:16px 0 0;color:#3f3f3f;font-size:14px;line-height:1.6;">
            We've removed your listing <strong>"${escape(p.listingTitle)}"</strong> because it did not meet our community guidelines.
          </p>
          <p style="margin:16px 0 0;color:#3f3f3f;font-size:14px;line-height:1.6;">
            <strong>Reason:</strong> ${escape(p.reason)}
          </p>
          ${customBlock}
          <p style="margin:24px 0 0;color:#3f3f3f;font-size:14px;line-height:1.6;">
            If you believe this was a mistake, reply to this email and our team will take a second look.
          </p>
          <p style="margin:24px 0 0;color:#6a6a6a;font-size:13px;line-height:1.6;">
            — The MIDDLEMAN team
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
