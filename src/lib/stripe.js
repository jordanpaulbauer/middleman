import { loadStripe } from '@stripe/stripe-js';

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Memoized Stripe.js instance. loadStripe() resolves once the Stripe.js
// script is fetched and is safe to call multiple times.
export const stripePromise = key ? loadStripe(key) : null;
export const isStripeEnabled = !!key;
