// stripe-webhook
// Receives signed events from Stripe and advances the closing state machine.
//
// JWT verification is OFF for this function (Stripe doesn't send a Supabase
// JWT — it signs the body with the webhook secret instead).
//
// Required secrets:
//   STRIPE_SECRET_KEY      — sk_test_* / sk_live_*
//   STRIPE_WEBHOOK_SECRET  — whsec_*  (from the Stripe webhook endpoint settings)
//
// Events handled:
//   payment_intent.succeeded  → closing.status = 'paid'
//   payment_intent.payment_failed → log + closing.status stays pending_payment
//   charge.dispute.created    → closing.status = 'disputed'
//   transfer.created          → record transfer ID on closing
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe secrets not configured", { status: 500 });
  }
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2024-12-18.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing stripe-signature", { status: 400 });

  let event: Stripe.Event;
  const body = await req.text();
  try {
    // constructEventAsync uses Web Crypto (Deno-compatible).
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return new Response(`signature verification failed: ${err?.message}`, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const closingId = pi.metadata?.closing_id;
        if (!closingId) break;
        await admin
          .from("closings")
          .update({ status: "paid" })
          .eq("id", closingId);
        await admin.from("audit_log").insert({
          entity_type: "closing",
          entity_id: closingId,
          action: "payment_succeeded",
          payload: { payment_intent: pi.id, amount: pi.amount },
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const closingId = pi.metadata?.closing_id;
        if (!closingId) break;
        await admin.from("audit_log").insert({
          entity_type: "closing",
          entity_id: closingId,
          action: "payment_failed",
          payload: { reason: pi.last_payment_error?.message },
        });
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        // Map back to closing via the charge → payment_intent.
        const charge = await stripe.charges.retrieve(dispute.charge as string);
        const piId = charge.payment_intent as string | null;
        if (!piId) break;
        const { data: closing } = await admin
          .from("closings")
          .select("id")
          .eq("stripe_payment_intent_id", piId)
          .maybeSingle();
        if (!closing) break;
        await admin
          .from("closings")
          .update({ status: "disputed", dispute_reason: dispute.reason })
          .eq("id", closing.id);
        await admin.from("audit_log").insert({
          entity_type: "closing",
          entity_id: closing.id,
          action: "disputed",
          payload: { reason: dispute.reason, amount: dispute.amount },
        });
        break;
      }
      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        const closingId = transfer.metadata?.closing_id;
        const role = transfer.metadata?.role; // 'seller' | 'closer'
        if (!closingId || !role) break;
        const column = role === "seller"
          ? "stripe_transfer_seller_id"
          : "stripe_transfer_closer_id";
        await admin
          .from("closings")
          .update({ [column]: transfer.id })
          .eq("id", closingId);
        break;
      }
      case "account.updated": {
        // Sync the user's payouts_enabled flag and, if they just unlocked
        // payouts, fire any transfers that were deferred when their
        // closings finalized before they'd finished Connect onboarding.
        const account = event.data.object as Stripe.Account;
        const { data: profile } = await admin
          .from("profiles")
          .select("id, stripe_payouts_enabled")
          .eq("stripe_account_id", account.id)
          .single();
        if (!profile) break;

        const newPayoutsEnabled = !!account.payouts_enabled;
        await admin
          .from("profiles")
          .update({ stripe_payouts_enabled: newPayoutsEnabled })
          .eq("id", profile.id);

        // If payouts just became available, flush any pending payouts
        // for closings where this user is the seller or closer.
        if (newPayoutsEnabled) {
          await flushPendingPayouts(stripe, admin, profile.id, account.id);
        }
        break;
      }
      default:
        // Ignore everything else.
        break;
    }
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return new Response(`handler error: ${err?.message}`, { status: 500 });
  }
});

// Triggered from the account.updated handler when a user completes Connect
// onboarding (payouts_enabled flips true). Finds any completed closings
// where this user's payout was deferred and fires the transfers now.
// Wraps each transfer in its own try so one Stripe error doesn't strand
// the rest. Source_transaction ties the transfer back to the original
// charge so refunds correctly reverse the flow.
async function flushPendingPayouts(
  stripe: Stripe,
  admin: ReturnType<typeof createClient>,
  userId: string,
  stripeAccountId: string,
) {
  // Pending seller payouts where this user is the seller.
  const { data: sellerClosings } = await admin
    .from("closings")
    .select("*")
    .eq("seller_id", userId)
    .eq("pending_seller_payout", true);

  for (const c of sellerClosings || []) {
    try {
      const total = c.agreed_price_cents as number;
      const platformFee = Math.round(total * (c.platform_fee_bps as number) / 10000);
      const closerCommission = Math.round(total * (c.commission_bps as number) / 10000);
      const sellerNet = total - platformFee - closerCommission;
      let sourceTransaction: string | undefined;
      if (c.stripe_payment_intent_id) {
        const pi = await stripe.paymentIntents.retrieve(c.stripe_payment_intent_id);
        sourceTransaction = (pi.latest_charge as string) || undefined;
      }
      const t = await stripe.transfers.create({
        amount: sellerNet,
        currency: "usd",
        destination: stripeAccountId,
        source_transaction: sourceTransaction,
        metadata: { closing_id: c.id, role: "seller", flushed_from_pending: "true" },
        description: `MIDDLEMAN seller payout (deferred) ${c.id}`,
      });
      await admin
        .from("closings")
        .update({ stripe_transfer_seller_id: t.id, pending_seller_payout: false })
        .eq("id", c.id);
    } catch (err) {
      console.warn(`[stripe-webhook] failed to flush seller payout for closing ${c.id}:`, err);
    }
  }

  // Pending closer commissions where this user is the closer.
  const { data: closerClosings } = await admin
    .from("closings")
    .select("*")
    .eq("closer_id", userId)
    .eq("pending_closer_payout", true);

  for (const c of closerClosings || []) {
    try {
      const total = c.agreed_price_cents as number;
      const closerCommission = Math.round(total * (c.commission_bps as number) / 10000);
      let sourceTransaction: string | undefined;
      if (c.stripe_payment_intent_id) {
        const pi = await stripe.paymentIntents.retrieve(c.stripe_payment_intent_id);
        sourceTransaction = (pi.latest_charge as string) || undefined;
      }
      const t = await stripe.transfers.create({
        amount: closerCommission,
        currency: "usd",
        destination: stripeAccountId,
        source_transaction: sourceTransaction,
        metadata: { closing_id: c.id, role: "closer", flushed_from_pending: "true" },
        description: `MIDDLEMAN closer commission (deferred) ${c.id}`,
      });
      await admin
        .from("closings")
        .update({ stripe_transfer_closer_id: t.id, pending_closer_payout: false })
        .eq("id", c.id);
    } catch (err) {
      console.warn(`[stripe-webhook] failed to flush closer payout for closing ${c.id}:`, err);
    }
  }
}
