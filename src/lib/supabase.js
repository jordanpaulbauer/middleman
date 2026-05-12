import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// True only when both env vars are present at build time.
// When false, services/index.js falls back to the in-memory demo backend
// so the app keeps working without a configured Supabase project.
export const isSupabaseEnabled = Boolean(url && anonKey);

export const supabase = isSupabaseEnabled
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Disable supabase-js's navigator.locks-based serialization of
        // auth calls. The default lock has a nasty failure mode: if any
        // single auth operation hangs (slow mobile network, flaky DNS,
        // etc.) it holds the lock until completion, blocking every
        // subsequent call including signInWithPassword. Result: real
        // users seeing "timed out after 12000ms" on first sign-in.
        //
        // Bypassing the lock means we accept a tiny race-condition risk
        // in exchange for reliable behavior under bad network conditions.
        // For our app's usage pattern (auth ops are user-initiated, not
        // hammered concurrently) the trade-off is clearly correct.
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    })
  : null;

if (!isSupabaseEnabled && import.meta.env.DEV) {
  console.info(
    '[supabase] env not set — running on in-memory demo backend. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to enable Supabase.'
  );
}
