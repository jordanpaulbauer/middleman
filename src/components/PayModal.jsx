import React, { useEffect, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock } from 'lucide-react';
import { stripePromise, isStripeEnabled } from '../lib/stripe';
import { Stripe as StripeService } from '../services';

// In-app payment modal. Opens directly in the closer's flow so they (or a
// guest buyer) can complete payment without leaving the page. Same code path
// as the standalone /pay/:closingId page; this component is the better UX
// for testing or for buyers who prefer not to leave the marketplace.
export default function PayModal({ closing, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!isStripeEnabled) {
      setError('Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in .env.local.');
      setLoading(false);
      return;
    }

    // Race the network call against a 10s timeout so the modal never hangs
    // silently — if the call is wedged, the user gets a real message.
    const timeout = new Promise((_, reject) => setTimeout(
      () => reject(new Error('Timed out reaching the payment service. Try again.')),
      10000
    ));

    Promise.race([StripeService.createPaymentIntent(closing.id), timeout])
      .then((intent) => {
        if (cancelled) return;
        setClientSecret(intent.client_secret);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Could not load payment.');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [closing.id]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={16} color="var(--text-muted)" />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Complete payment</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text)',
          }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{
            padding: 14, background: 'var(--bg-subtle)', borderRadius: 12,
            marginBottom: 18, fontSize: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Buyer</span>
              <span style={{ fontWeight: 500 }}>{closing.buyer_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Email</span>
              <span style={{ fontWeight: 500 }}>{closing.buyer_email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total</span>
              <span style={{ fontWeight: 500, fontSize: 18 }}>
                ${(closing.agreed_price || 0).toLocaleString('en-US')}
              </span>
            </div>
          </div>

          {loading && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              Loading payment…
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 14px', background: 'var(--red-light)', color: 'var(--red)',
              borderRadius: 10, fontSize: 14,
            }}>{error}</div>
          )}

          {!loading && !error && clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe' } }}
            >
              <CheckoutForm onSuccess={onSuccess} closingId={closing.id} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckoutForm({ onSuccess, closingId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr('');
    // Confirm payment without redirect — we want to stay in the modal.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      setErr(error.message || 'Payment failed');
      setSubmitting(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess?.(paymentIntent);
      // Note: server-side confirmation comes via webhook; this handler is
      // just for the UX. The closing's status flips to 'paid' once the
      // payment_intent.succeeded webhook lands (usually within a second).
    } else {
      setErr(`Payment status: ${paymentIntent?.status || 'unknown'}`);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {err && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'var(--red-light)', color: 'var(--red)',
          borderRadius: 10, fontSize: 14,
        }}>{err}</div>
      )}
      <button type="submit" disabled={!stripe || submitting} style={{
        width: '100%', marginTop: 14, padding: '14px 22px',
        background: 'var(--rausch)', color: 'white', border: 'none', borderRadius: 10,
        fontSize: 15, fontWeight: 500,
        cursor: (!stripe || submitting) ? 'not-allowed' : 'pointer',
        opacity: (!stripe || submitting) ? 0.6 : 1,
      }}>
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  );
}
