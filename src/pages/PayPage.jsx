import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';
import { stripePromise, isStripeEnabled } from '../lib/stripe';
import { Stripe as StripeService } from '../services';
import { supabase } from '../lib/supabase';
import Seo from '../components/Seo';

// Buyer-facing checkout page. Reached via the "Send checkout link" flow:
// closer creates a closing → backend mints a PaymentIntent → buyer is
// emailed `/pay/{closingId}` → this page collects payment details with
// Stripe Elements and confirms.
//
// We don't require the buyer to sign in. The closing_id in the URL is the
// only identifier — anyone with the link can complete payment. RLS on the
// closings table prevents reading sensitive fields, so we proxy through the
// stripe-create-payment-intent function which scopes access by closer/seller.
//
// (Note: buyer-side direct read is intentional — the URL is the bearer token.
// In a stricter design you'd add a per-closing payment_token column.)
export default function PayPage() {
  const { closingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [closing, setClosing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isStripeEnabled) {
          throw new Error(
            'Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in .env.local.'
          );
        }
        // Anyone can read minimal closing fields; we just need price + buyer email
        // to display, plus the payment intent client secret. The PaymentIntent
        // is created by the closer when the closing is initiated.
        const { data: cl, error: clErr } = await supabase
          .from('closings')
          .select('id, buyer_name, buyer_email, agreed_price_cents, status, stripe_payment_intent_id')
          .eq('id', closingId)
          .maybeSingle();
        if (clErr || !cl) throw new Error('This payment link is invalid or expired.');
        if (cancelled) return;
        if (cl.status === 'paid' || cl.status === 'item_confirmed' || cl.status === 'completed') {
          setClosing(cl);
          setError('This payment has already been completed.');
          return;
        }
        // Fetch the client secret. The closer typically calls
        // createPaymentIntent on closing creation, but we re-issue from here
        // if it wasn't already created.
        const intent = await StripeService.createPaymentIntent(closingId);
        if (cancelled) return;
        setClientSecret(intent.client_secret);
        setClosing(cl);
      } catch (e) {
        setError(e.message || 'Could not load payment details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [closingId]);

  return (
    <div style={wrap}>
      <Seo title="Complete your payment" noIndex />
      <header style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-light)' }}>
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', color: 'var(--rausch)' }}>
          middleman
        </span>
      </header>
      <main style={{
        maxWidth: 540, width: '100%', margin: '40px auto',
        padding: '0 24px 64px',
      }}>
        {loading ? (
          <Card>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading payment…</div>
          </Card>
        ) : error ? (
          <Card>
            <h1 style={title}>Payment unavailable</h1>
            <p style={muted}>{error}</p>
            <button onClick={() => navigate('/')} style={primaryBtn}>Back to home</button>
          </Card>
        ) : (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
              <Lock size={14} /> Secure checkout via Stripe
            </div>
            <h1 style={title}>Complete your purchase</h1>
            <div style={{
              padding: 16, background: 'var(--bg-subtle)', borderRadius: 12,
              marginBottom: 18, fontSize: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Buyer</span>
                <span style={{ fontWeight: 500 }}>{closing.buyer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 18 }}>
                  ${(closing.agreed_price_cents / 100).toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: 'stripe' } }}
              >
                <CheckoutForm closingId={closing.id} />
              </Elements>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

function CheckoutForm({ closingId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr('');
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/${closingId}?status=success`,
      },
    });
    // confirmPayment redirects on success. If we're back here, something failed.
    if (error) {
      setErr(error.message || 'Payment failed');
    }
    setSubmitting(false);
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
        ...primaryBtn,
        marginTop: 18, width: '100%',
        opacity: (!stripe || submitting) ? 0.6 : 1,
        cursor: (!stripe || submitting) ? 'not-allowed' : 'pointer',
      }}>
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
      <div style={{
        textAlign: 'center', fontSize: 12, color: 'var(--text-light)',
        marginTop: 12,
      }}>
        Test mode — use card 4242 4242 4242 4242, any future date, any CVC.
      </div>
    </form>
  );
}

function Card({ children }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border-light)',
      borderRadius: 18, padding: '28px 28px 24px',
      boxShadow: 'var(--shadow-sm)',
    }}>{children}</div>
  );
}

const wrap = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #fff0f3 0%, #ffffff 50%, #fff0f3 100%)',
};
const title = { fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', margin: '0 0 12px' };
const muted = { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 18px' };
const primaryBtn = {
  padding: '14px 22px', background: 'var(--rausch)',
  color: 'white', border: 'none', borderRadius: 10,
  fontSize: 15, fontWeight: 600, cursor: 'pointer',
};
