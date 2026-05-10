// delete-account
// Deletes the calling user's auth.users row. Postgres cascades wipe the
// profile, listings, watchlist, notifications, conversations the user owns,
// etc. Closings reference the user with ON DELETE RESTRICT so a user
// involved in a non-final closing can't delete (we surface that as an error).
//
// Required secrets:
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    // Block deletion if the user has any non-terminal closings — refunds and
    // disputes need to be resolved first. Terminal = completed | refunded.
    const { data: blockingClosings } = await admin
      .from("closings")
      .select("id, status")
      .or(`seller_id.eq.${user.id},closer_id.eq.${user.id}`)
      .not("status", "in", '("completed","refunded")');

    if (blockingClosings && blockingClosings.length > 0) {
      return json({
        error: `Cannot delete account while ${blockingClosings.length} active deal(s) are in progress. Resolve them first.`,
      }, 409);
    }

    // Best-effort cleanup before deletion: cancel any open listings owned
    // by the user so they don't linger as orphans.
    await admin
      .from("listings")
      .update({ status: "expired" })
      .eq("seller_id", user.id)
      .eq("status", "open");

    // Soft-mark records that survive (closings, reviews) so historical data
    // remains, but the user's identity is anonymized. We don't delete them
    // because counterparties have a legitimate need for the audit trail.
    // (Profile row gets wiped via cascade below.)
    await admin.from("audit_log").insert({
      entity_type: "user",
      entity_id: user.id,
      actor_id: user.id,
      action: "account_deleted",
      payload: { email: user.email },
    });

    // Delete the auth user. Postgres cascades remove profile, listings (those
    // not already sold), watchlist, notifications, conversations, etc.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ success: true });
  } catch (err) {
    console.error("[delete-account]", err);
    return json({ error: err?.message || "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
