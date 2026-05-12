import React, { useEffect, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock } from 'lucide-react';
import { stripePromise, isStripeEnabled } from '../lib/stripe';
import { Stripe as StripeService, Auth } from '../services';

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
            }}>
              <div>{error}</div>
              {/* If the failure looks like a client-side timeout, surface the
                  one-click recovery so the user doesn't have to dig through
                  DevTools to unstick supabase-js. */}
              {/timed out/i.test(error) && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  Looks like your session is stuck.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('This will clear your local session and reload. Continue?')) {
                        Auth.resetSession();
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text)', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}
                  >
                    Reset session
                  </button>
                </div>
              )}
            </div>
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
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [paymentElementBlocked, setPaymentElementBlocked] = useState(false);
  const [err, setErr] = useState('');

  // Stripe.js loads asynchronously; PaymentElement only fires onReady
  // once it's actually mounted and ready to accept input. We gate the
  // submit button on both so a click can't fire stripe.confirmPayment
  // against an unmounted element.
  //
  // If onReady doesn't fire within 12s, something is blocking the
  // Stripe iframe — usually an ad blocker, privacy extension, or
  // strict network filter blocking js.stripe.com / m.stripe.network.
  // Flag it so we can show an actionable error.
  useEffect(() => {
    if (paymentElementReady) return;
    const t = setTimeout(() => {
      if (!paymentElementReady) setPaymentElementBlocked(true);
    }, 12000);
    return () => clearTimeout(t);
  }, [paymentElementReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !paymentElementReady) return;
    setSubmitting(true);
    setErr('');
    try {
      // 30s timeout so a wedged Stripe.js call can't trap the user on
      // "Processing…" forever. confirmPayment normally returns in <3s;
      // a slow 3DS challenge has its own modal/redirect and shouldn't
      // hold this promise open that long either.
      const timeout = new Promise((_, rej) => setTimeout(
        () => rej(new Error('Payment is taking longer than expected. Refresh and check the closing status — your card may have already been charged.')),
        30000
      ));
      const result = await Promise.race([
        stripe.confirmPayment({ elements, redirect: 'if_required' }),
        timeout,
      ]);
      const { error, paymentIntent } = result || {};
      if (error) {
        setErr(error.message || 'Payment failed');
        return;
      }
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        // Server-side confirmation comes via webhook; this handler just
        // closes the modal. The closing's status flips to 'paid' once
        // payment_intent.succeeded lands (usually within a second).
        onSuccess?.(paymentIntent);
        // Don't reset submitting — onSuccess unmounts the modal.
        return;
      }
      setErr(`Payment status: ${paymentIntent?.status || 'unknown'}`);
    } catch (err) {
      setErr(err?.message || 'Payment failed');
    } finally {
      // Always unlock the button if the modal is still mounted. The
      // success path returns early so this is a no-op there; the
      // error/timeout paths get the button back to "Pay now" so the
      // user can retry.
      setSubmitting(false);
    }
  };

  const canSubmit = !!stripe && !!elements && paymentElementReady && !submitting;

  return (
    <form onSubmit={handleSubmit}>
      {/* Placeholder while Stripe.js + PaymentElement boot up. Stripe's
          PaymentElement is invisible until it renders, so without this
          the user sees a blank gap and might click Pay too early. */}
      {!paymentElementReady && !paymentElementBlocked && (
        <div style={{
          minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-subtle)', borderRadius: 10,
          fontSize: 14, color: 'var(--text-muted)', flexDirection: 'column', gap: 10,
        }}>
          <div className="spinner-dark" />
          <span>Loading card form…</span>
        </div>
      )}
      {paymentElementBlocked && (
        <div style={{
          padding: '14px 16px', background: 'var(--red-light)', color: 'var(--red)',
          borderRadius: 10, fontSize: 14, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>The card form couldn't load.</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            This usually means a browser extension (ad blocker, privacy plugin) or your network is blocking Stripe.
            Try one of:
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--text-secondary)' }}>
            <li>Open this page in an incognito / private window</li>
            <li>Disable ad blockers and privacy extensions on this site, then reload</li>
            <li>Try a different browser or device</li>
          </ul>
        </div>
      )}
      <div style={{ display: paymentElementReady ? 'block' : 'none' }}>
        <PaymentElement onReady={() => setPaymentElementReady(true)} />
      </div>
      {err && (
        <div style={{
          marginTop: 12, padding: '10px 14px',
          background: 'var(--red-light)', color: 'var(--red)',
          borderRadius: 10, fontSize: 14,
        }}>{err}</div>
      )}
      {!paymentElementBlocked && (
        <button type="submit" disabled={!canSubmit} style={{
          width: '100%', marginTop: 14, padding: '14px 22px',
          background: 'var(--rausch)', color: 'white', border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 500,
          cursor: !canSubmit ? 'not-allowed' : 'pointer',
          opacity: !canSubmit ? 0.6 : 1,
        }}>
          {submitting
            ? 'Processing…'
            : !paymentElementReady ? 'Loading payment form…' : 'Pay now'}
        </button>
      )}
    </form>
  );
}
