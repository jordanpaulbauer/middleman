// stripe-create-payment-intent
// Called by a closer after they've created a closing record. Creates a Stripe
// PaymentIntent that the buyer can pay; the platform receives the funds and
// will later transfer the seller payout and closer commission via webhook.
//
// We use the "separate charges and transfers" model so the platform owns the
// funds during the dispute / handoff window. Transfers fire on
// charge.dispute.closed = won OR on the "Mark complete" closing transition.
//
// Required secrets:
//   STRIPE_SECRET_KEY
//
// Body: { closing_id: string }
// Response: { client_secret: string, payment_intent_id: string }
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
    if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY missing" }, 500);
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
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const { closing_id } = await req.json();
    if (!closing_id) return json({ error: "closing_id required" }, 400);

    // Load closing — only the closer or seller may touch it (RLS handles this
    // for the user-scoped client; we use admin to read because we need profile
    // joins for the Stripe accounts).
    const { data: closing, error: clErr } = await admin
      .from("closings")
      .select("*")
      .eq("id", closing_id)
      .single();
    if (clErr || !closing) return json({ error: "closing not found" }, 404);

    if (user.id !== closing.closer_id && user.id !== closing.seller_id) {
      return json({ error: "forbidden" }, 403);
    }
    if (closing.stripe_payment_intent_id) {
      // Already created — return the existing client_secret instead of charging twice.
      const existing = await stripe.paymentIntents.retrieve(closing.stripe_payment_intent_id);
      return json({
        client_secret: existing.client_secret,
        payment_intent_id: existing.id,
        already_existed: true,
      });
    }

    // Pre-flight: both seller and closer must have Stripe accounts before we
    // can split the payment. We don't require their `payouts_enabled` to be
    // true at this stage; that's checked on the transfer side.
    const { data: parties } = await admin
      .from("profiles")
      .select("id, stripe_account_id, full_name")
      .in("id", [closing.seller_id, closing.closer_id]);
    const seller = parties?.find(p => p.id === closing.seller_id);
    const closer = parties?.find(p => p.id === closing.closer_id);
    if (!seller?.stripe_account_id) {
      return json({ error: "seller has not connected Stripe yet" }, 409);
    }
    if (!closer?.stripe_account_id) {
      return json({ error: "closer has not connected Stripe yet" }, 409);
    }

    // Compute splits in cents.
    const total = closing.agreed_price_cents as number;
    const platformFee = Math.round(total * (closing.platform_fee_bps as number) / 10000);
    const closerCommission = Math.round(total * (closing.commission_bps as number) / 10000);
    // Seller gets whatever's left after platform fee and closer commission.
    // (We track this for the transfer step; the PaymentIntent itself just
    // collects the gross amount on the platform.)
    const sellerNet = total - platformFee - closerCommission;
    if (sellerNet <= 0) return json({ error: "fees exceed total" }, 400);

    const intent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        closing_id,
        seller_id: closing.seller_id,
        closer_id: closing.closer_id,
        seller_account: seller.stripe_account_id,
        closer_account: closer.stripe_account_id,
        platform_fee_cents: String(platformFee),
        closer_commission_cents: String(closerCommission),
        seller_net_cents: String(sellerNet),
      },
      receipt_email: closing.buyer_email,
      description: `MIDDLEMAN closing ${closing_id}`,
    });

    await admin
      .from("closings")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", closing_id);

    return json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
    });
  } catch (err) {
    console.error("[stripe-create-payment-intent]", err);
    return json({ error: err?.message || "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
