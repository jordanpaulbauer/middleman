// stripe-finalize-closing
// Called when both parties confirm the handoff. Issues two Stripe transfers
// from the platform balance (where the buyer's payment landed) to the seller
// and the closer's connected accounts. Marks the closing as completed and
// the underlying listing as sold.
//
// Required secrets:
//   STRIPE_SECRET_KEY
//
// Body: { closing_id: string }
// Response: { transfer_seller_id, transfer_closer_id }
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

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { closing_id } = await req.json();
    if (!closing_id) return json({ error: "closing_id required" }, 400);

    const { data: closing, error } = await admin
      .from("closings")
      .select("*")
      .eq("id", closing_id)
      .single();
    if (error || !closing) return json({ error: "closing not found" }, 404);

    if (user.id !== closing.closer_id && user.id !== closing.seller_id) {
      return json({ error: "forbidden" }, 403);
    }
    if (closing.status === "completed") {
      return json({ error: "already completed" }, 409);
    }
    if (closing.status !== "item_confirmed") {
      return json({ error: `cannot finalize from status '${closing.status}'` }, 409);
    }
    if (!closing.stripe_payment_intent_id) {
      return json({ error: "no payment intent on this closing" }, 409);
    }

    // Get seller + closer connected accounts. Either party may not have
    // finished Connect onboarding yet — that's fine, we'll mark their
    // payout pending and the stripe-webhook (account.updated) flushes
    // it once they complete onboarding.
    const { data: parties } = await admin
      .from("profiles")
      .select("id, stripe_account_id")
      .in("id", [closing.seller_id, closing.closer_id]);
    const seller = parties?.find(p => p.id === closing.seller_id);
    const closerProfile = parties?.find(p => p.id === closing.closer_id);

    // Use the source PaymentIntent's charge ID so transfers are reversed if
    // the original charge is refunded later.
    const pi = await stripe.paymentIntents.retrieve(closing.stripe_payment_intent_id);
    const sourceTransaction = (pi.latest_charge as string) || undefined;

    const total = closing.agreed_price_cents as number;
    const platformFee = Math.round(total * (closing.platform_fee_bps as number) / 10000);
    const closerCommission = Math.round(total * (closing.commission_bps as number) / 10000);
    const sellerNet = total - platformFee - closerCommission;

    // Try the seller transfer. If they don't have Connect yet, mark pending.
    let sellerTransferId = closing.stripe_transfer_seller_id as string | null;
    let pendingSellerPayout = false;
    if (!sellerTransferId) {
      if (seller?.stripe_account_id) {
        const t = await stripe.transfers.create({
          amount: sellerNet,
          currency: "usd",
          destination: seller.stripe_account_id,
          source_transaction: sourceTransaction,
          metadata: { closing_id, role: "seller" },
          description: `MIDDLEMAN seller payout ${closing_id}`,
        });
        sellerTransferId = t.id;
      } else {
        pendingSellerPayout = true;
      }
    }

    // Same for the closer.
    let closerTransferId = closing.stripe_transfer_closer_id as string | null;
    let pendingCloserPayout = false;
    if (!closerTransferId) {
      if (closerProfile?.stripe_account_id) {
        const t = await stripe.transfers.create({
          amount: closerCommission,
          currency: "usd",
          destination: closerProfile.stripe_account_id,
          source_transaction: sourceTransaction,
          metadata: { closing_id, role: "closer" },
          description: `MIDDLEMAN closer commission ${closing_id}`,
        });
        closerTransferId = t.id;
      } else {
        pendingCloserPayout = true;
      }
    }

    const completedAt = new Date().toISOString();
    await admin
      .from("closings")
      .update({
        status: "completed",
        stripe_transfer_seller_id: sellerTransferId,
        stripe_transfer_closer_id: closerTransferId,
        pending_seller_payout: pendingSellerPayout,
        pending_closer_payout: pendingCloserPayout,
        completed_at: completedAt,
      })
      .eq("id", closing_id);

    // Mark listing as sold.
    await admin
      .from("listings")
      .update({ status: "sold" })
      .eq("id", closing.listing_id);

    await admin.from("audit_log").insert({
      entity_type: "closing",
      entity_id: closing_id,
      actor_id: user.id,
      action: "completed",
      payload: {
        seller_transfer: sellerTransferId,
        closer_transfer: closerTransferId,
        pending_seller_payout: pendingSellerPayout,
        pending_closer_payout: pendingCloserPayout,
        seller_net_cents: sellerNet,
        closer_commission_cents: closerCommission,
        platform_fee_cents: platformFee,
      },
    });

    return json({
      transfer_seller_id: sellerTransferId,
      transfer_closer_id: closerTransferId,
      pending_seller_payout: pendingSellerPayout,
      pending_closer_payout: pendingCloserPayout,
      completed_at: completedAt,
    });
  } catch (err) {
    console.error("[stripe-finalize-closing]", err);
    return json({ error: err?.message || "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
