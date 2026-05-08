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
      },
    })
  : null;

if (!isSupabaseEnabled && import.meta.env.DEV) {
  console.info(
    '[supabase] env not set — running on in-memory demo backend. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to enable Supabase.'
  );
}
