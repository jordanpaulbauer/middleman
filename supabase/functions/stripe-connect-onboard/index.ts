// stripe-connect-onboard
// Creates a Stripe Connect Express account for the calling user (if they
// don't have one yet) and returns an onboarding link they can be redirected
// to. Called by the "Connect with Stripe" button on the Profile page.
//
// Required Edge Function secrets:
//   STRIPE_SECRET_KEY  — sk_test_*  (or sk_live_* in production)
//
// Body: { return_url: string, refresh_url: string }
// Response: { url: string, account_id: string }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: "STRIPE_SECRET_KEY is not configured" }, 500);
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-12-18.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("stripe_account_id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    let accountId = profile?.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile?.email || user.email,
        metadata: { user_id: user.id },
        business_profile: {
          name: profile?.full_name || undefined,
        },
      });
      accountId = account.id;
      await adminClient
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
    }

    const body = await req.json().catch(() => ({}));
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: body.return_url || `${supabaseUrl}/profile`,
      refresh_url: body.refresh_url || `${supabaseUrl}/profile`,
      type: "account_onboarding",
    });

    return json({ url: accountLink.url, account_id: accountId });
  } catch (err) {
    console.error("[stripe-connect-onboard]", err);
    return json({ error: err?.message || "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
