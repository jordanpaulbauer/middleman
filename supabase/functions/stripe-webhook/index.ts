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
