/**
 * MIDDLEMAN Services Layer
 *
 * Every UI call goes through here. Two backends:
 *  - Supabase (when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set)
 *  - In-memory demo (fallback for offline dev / tests)
 *
 * Read methods (`getAll`, `getById`, `isInWatchlist`, ...) stay synchronous
 * by reading from a per-table cache. The cache is populated by `refreshAll()`
 * after auth resolves, and kept fresh by Postgres realtime subscriptions.
 *
 * Write methods (`create`, `claim`, `add`, ...) are always async — they write
 * to Postgres, and the realtime subscription updates the cache.
 */
import {
  DEMO_USER, DEMO_USERS, DEMO_LISTINGS, DEMO_CLOSINGS,
  DEMO_CONVERSATIONS, DEMO_MESSAGES, DEMO_REVIEWS,
  DEMO_WATCHLIST, DEMO_NOTIFICATIONS, getUserById,
} from '../data/demo';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

const clone = (d) => JSON.parse(JSON.stringify(d));

// In-memory cache. Same shape regardless of backend.
let listings = isSupabaseEnabled ? [] : clone(DEMO_LISTINGS);
let closings = isSupabaseEnabled ? [] : clone(DEMO_CLOSINGS);
let conversations = isSupabaseEnabled ? [] : clone(DEMO_CONVERSATIONS);
let messages = isSupabaseEnabled ? [] : clone(DEMO_MESSAGES);
let reviews = isSupabaseEnabled ? [] : clone(DEMO_REVIEWS);
let watchlist = isSupabaseEnabled ? [] : clone(DEMO_WATCHLIST);
let notifications = isSupabaseEnabled ? [] : clone(DEMO_NOTIFICATIONS);
let profilesById = {}; // populated when we load listings/closings
let currentUser = isSupabaseEnabled ? null : clone(DEMO_USER);

// Subscribers — every page hooks into this for re-renders on data change.
const listeners = new Set();
function notify() { listeners.forEach(fn => fn()); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ── Mappers: Postgres rows ↔ UI shape ─────────────────────────────
// Postgres stores cents/basis-points; the UI uses dollars/percent.
const bpsToPct = (bps) => Math.round((bps || 0) / 100);
const pctToBps = (pct) => Math.round((pct || 0) * 100);
// Preserve cents — the UI formats with two decimals so the user sees
// the exact mathematical split (e.g., $0.20 closer commission on $2),
// not a misleading rounded-to-zero.
const centsToDollars = (cents) => (cents || 0) / 100;
const dollarsToCents = (dollars) => Math.round((dollars || 0) * 100);

function dbListingToUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    seller_id: row.seller_id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    price: centsToDollars(row.price_cents),
    commission: bpsToPct(row.commission_bps),
    location: row.location,
    photos: row.photos || [],
    status: row.status,
    claimed_by: row.claimed_by,
    claim_start: row.claim_start,
    claim_end: row.claim_end,
    has_been_extended: row.has_been_extended,
    views: row.views || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function dbClosingToUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    listing_id: row.listing_id,
    seller_id: row.seller_id,
    closer_id: row.closer_id,
    buyer_name: row.buyer_name,
    buyer_email: row.buyer_email,
    agreed_price: centsToDollars(row.agreed_price_cents),
    commission_rate: bpsToPct(row.commission_bps),
    platform_fee_pct: bpsToPct(row.platform_fee_bps),
    status: row.status,
    stripe_payment_intent_id: row.stripe_payment_intent_id,
    stripe_checkout_url: row.stripe_checkout_url,
    pending_seller_payout: !!row.pending_seller_payout,
    pending_closer_payout: !!row.pending_closer_payout,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

function dbReviewToUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    listing_id: row.listing_id,
    closing_id: row.closing_id,
    seller_id: row.seller_id,
    closer_id: row.closer_id,
    author_id: row.author_id,
    stars: row.stars,
    text: row.text,
    created_at: row.created_at,
    published_at: row.published_at,
  };
}

// Cache profiles we encounter so getUserById() can synchronously hand them out.
function cacheProfile(p) {
  if (p?.id) profilesById[p.id] = p;
}
function getProfileFromCache(id) {
  return profilesById[id] || (DEMO_USERS.find(u => u.id === id)) || null;
}

// ── Auth ──────────────────────────────────────────────────────────
const AUTH_KEY = 'middleman_auth';
const readAuth = () => {
  try { const raw = localStorage.getItem(AUTH_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const writeAuth = (val) => {
  try { if (val) localStorage.setItem(AUTH_KEY, JSON.stringify(val)); else localStorage.removeItem(AUTH_KEY); } catch {}
};

// Race a promise against a timeout. Used to detect a wedged supabase-js
// client (stale localStorage tokens cause getSession() to hang forever)
// so we can self-heal instead of leaving the user staring at a spinner.
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// Nukes any sb-* keys supabase-js wrote to localStorage. Called when we
// detect a wedged client so the next getSession() returns cleanly.
function clearSupabaseAuthStorage() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

const persisted = !isSupabaseEnabled && typeof localStorage !== 'undefined' ? readAuth() : null;
let authenticated = !!persisted;
if (persisted && currentUser) currentUser = { ...currentUser, ...persisted };

async function loadProfileFromSupabase(authUserId) {
  if (!isSupabaseEnabled || !authUserId) return null;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle();
  if (profile) { cacheProfile(profile); return profile; }
  if (error && error.code !== 'PGRST116') {
    console.warn('[Auth] profile fetch failed:', error.message);
  }
  const { data: { user } } = await supabase.auth.getUser();
  return {
    id: authUserId,
    email: user?.email,
    full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'New user',
    photo_url: null,
    location: null,
    bio: null,
    specialties: [],
    joined_at: user?.created_at || new Date().toISOString(),
  };
}

// ── Cache loaders (Supabase mode) ────────────────────────────────
async function loadListings() {
  if (!isSupabaseEnabled) return;
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Listings] load:', error.message); return; }
  listings = (data || []).map(dbListingToUi);
  // Eagerly fetch any seller/closer profile we don't already have.
  const ids = new Set();
  data?.forEach(r => { if (r.seller_id) ids.add(r.seller_id); if (r.claimed_by) ids.add(r.claimed_by); });
  await loadProfilesByIds([...ids]);
}

async function loadClosings() {
  if (!isSupabaseEnabled || !currentUser?.id) return;
  const { data, error } = await supabase
    .from('closings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Closings] load:', error.message); return; }
  closings = (data || []).map(dbClosingToUi);
}

async function loadWatchlist() {
  if (!isSupabaseEnabled || !currentUser?.id) { watchlist = []; return; }
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', currentUser.id);
  if (error) { console.warn('[Watchlist] load:', error.message); return; }
  watchlist = data || [];
}

async function loadNotifications() {
  if (!isSupabaseEnabled || !currentUser?.id) { notifications = []; return; }
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Notifications] load:', error.message); return; }
  notifications = data || [];
}

async function loadReviews() {
  if (!isSupabaseEnabled) return;
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Reviews] load:', error.message); return; }
  reviews = (data || []).map(dbReviewToUi);
}

async function loadConversations() {
  if (!isSupabaseEnabled || !currentUser?.id) { conversations = []; return; }
  // RLS already filters to conversations where the user is seller_id or closer_id.
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false });
  if (error) { console.warn('[Conversations] load:', error.message); return; }
  conversations = data || [];
  // Eagerly fetch the other-party profiles so getConversations can render names sync.
  const ids = new Set();
  conversations.forEach(c => { ids.add(c.seller_id); ids.add(c.closer_id); });
  await loadProfilesByIds([...ids]);
}

async function loadMessages() {
  if (!isSupabaseEnabled || !currentUser?.id) { messages = []; return; }
  // RLS scopes this to conversations the user is part of. With small chat
  // volume per user this is fine; switch to per-conversation pagination
  // once any single user accumulates >1000 messages.
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.warn('[Messages] load:', error.message); return; }
  messages = data || [];
}

async function loadProfilesByIds(ids) {
  if (!isSupabaseEnabled || !ids?.length) return;
  const missing = ids.filter(id => !profilesById[id]);
  if (!missing.length) return;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', missing);
  if (error) return;
  data?.forEach(cacheProfile);
}

async function refreshAll() {
  await Promise.all([
    loadListings(),
    loadClosings(),
    loadWatchlist(),
    loadNotifications(),
    loadReviews(),
    loadConversations(),
    loadMessages(),
  ]);
  notify();
}

// ── Realtime subscriptions ───────────────────────────────────────
let realtimeChannel = null;
function startRealtime() {
  if (!isSupabaseEnabled || realtimeChannel) return;
  // Unique channel name per page session so HMR-leftover channels don't collide.
  const channelName = `middleman-data-${Math.random().toString(36).slice(2, 8)}`;
  realtimeChannel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
      loadListings().then(notify);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'closings' }, () => {
      loadClosings().then(notify);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
      loadReviews().then(notify);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, () => {
      loadWatchlist().then(notify);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
      loadNotifications().then(notify);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      // Fast path: append the new message to cache without a full reload.
      const m = payload.new;
      if (m && !messages.some(x => x.id === m.id)) {
        messages = [...messages, m];
      }
      // The conversation_last_message trigger updated last_message_*; reload
      // conversations so the inbox reorders. Cheap query (one user's convos).
      loadConversations().then(notify);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
      const m = payload.new;
      if (!m) return;
      messages = messages.map(x => x.id === m.id ? m : x);
      notify();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
      loadConversations().then(notify);
    })
    .subscribe();
}

// HMR cleanup — when Vite swaps this module, tear down realtime + auth listeners
// so we don't leak websocket subscriptions and stale onAuthStateChange handlers.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      if (realtimeChannel) supabase?.removeChannel(realtimeChannel);
    } catch {}
    realtimeChannel = null;
  });
}

// ── Auth bootstrap (Supabase mode) ───────────────────────────────
let authStateSub = null;
if (isSupabaseEnabled) {
  (async () => {
    // Self-healing session restore: if supabase-js wedges on a stale token
    // (happens after broken signups or killed-mid-auth tabs), getSession()
    // hangs forever. Race it against a 5s timeout. If it loses, clear the
    // sb-* keys and try once more — the second call returns null cleanly
    // and the user sees the login screen instead of an infinite spinner.
    let session = null;
    try {
      const result = await withTimeout(supabase.auth.getSession(), 5000, 'getSession');
      session = result?.data?.session || null;
    } catch (err) {
      console.warn('[Auth] session restore wedged, clearing stale tokens:', err.message);
      clearSupabaseAuthStorage();
      try {
        const retry = await withTimeout(supabase.auth.getSession(), 5000, 'getSession (retry)');
        session = retry?.data?.session || null;
      } catch (err2) {
        console.warn('[Auth] retry also failed; continuing without session');
      }
    }
    if (session?.user) {
      currentUser = await loadProfileFromSupabase(session.user.id);
      authenticated = !!currentUser;
      cacheProfile(currentUser);
      await refreshAll();
      startRealtime();
      Profile.touchLastSeen();
    } else {
      // Even logged-out users may want to read public listings (for /listing/:id).
      await loadListings();
      notify();
    }
  })();

  const { data: subData } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      currentUser = await loadProfileFromSupabase(session.user.id);
      authenticated = !!currentUser;
      cacheProfile(currentUser);
      await refreshAll();
      startRealtime();
      Profile.touchLastSeen();
    } else {
      currentUser = null;
      authenticated = false;
      // Keep public listings cache populated for the logged-out browsing case.
      watchlist = [];
      notifications = [];
      closings = [];
      conversations = [];
      messages = [];
    }
    notify();
  });
  authStateSub = subData?.subscription;
}

// HMR cleanup also unsubscribes the auth listener.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try { authStateSub?.unsubscribe(); } catch {}
    authStateSub = null;
  });
}

// Auth public API.
export const Auth = {
  getUser: () => (authenticated ? currentUser : null),
  isAuthenticated: () => authenticated,

  login: async (email, password) => {
    if (!email || !password) throw new Error('Email and password are required');
    if (isSupabaseEnabled) {
      // 12s timeout so a wedged supabase-js client doesn't trap the user
      // on a frozen Continue button. If this fires, Auth.resetSession()
      // gives them a recovery affordance.
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        12000,
        'signInWithPassword'
      );
      if (error) throw new Error(error.message);
      // Profile fetch is normally fast (<200ms). If it hangs >8s the
      // supabase-js client is wedged — fall back to a minimal user from
      // auth metadata so login still completes. onAuthStateChange will
      // refresh the profile properly once the client recovers.
      try {
        currentUser = await withTimeout(loadProfileFromSupabase(data.user.id), 8000, 'profile load');
      } catch (err) {
        console.warn('[Auth] post-login profile fetch wedged, using auth metadata:', err.message);
        currentUser = {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name
            || data.user.email?.split('@')[0]
            || 'New user',
          photo_url: null,
        };
      }
      authenticated = !!currentUser;
      cacheProfile(currentUser);
      notify();
      return currentUser;
    }
    if (password.length < 4) throw new Error('Password must be at least 4 characters');
    currentUser = { ...clone(DEMO_USER), email };
    authenticated = true;
    writeAuth({ email });
    notify();
    return currentUser;
  },

  register: async (data) => {
    if (!data?.email || !data?.full_name) throw new Error('Name and email are required');
    if (!data?.password || data.password.length < 4) throw new Error('Password must be at least 4 characters');
    if (isSupabaseEnabled) {
      const { data: result, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.full_name },
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });
      if (error) throw new Error(error.message);
      if (!result.session) {
        throw new Error('Account created — check your email to confirm before signing in.');
      }
      currentUser = await loadProfileFromSupabase(result.user.id);
      authenticated = !!currentUser;
      cacheProfile(currentUser);
      notify();
      return currentUser;
    }
    currentUser = { ...clone(DEMO_USER), email: data.email, full_name: data.full_name };
    authenticated = true;
    writeAuth({ email: data.email, full_name: data.full_name });
    notify();
    return currentUser;
  },

  logout: async () => {
    currentUser = null;
    authenticated = false;
    notify();
    if (isSupabaseEnabled) {
      try { await supabase.auth.signOut({ scope: 'local' }); }
      catch (err) { console.warn('[Auth] local signOut error (ignored):', err); }
      supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      // Belt-and-suspenders: supabase-js sometimes leaves the session token
      // in localStorage after a failed/incomplete refresh, which can wedge a
      // future page load. Clear any sb-* keys to guarantee a clean slate.
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k));
      } catch {}
      return;
    }
    writeAuth(null);
  },

  // Hard reset for when the supabase-js client is wedged and the user
  // can't get past the login screen / a frozen modal. Nukes every
  // sb-* localStorage key plus our own auth/mode keys and reloads the
  // page so React state, supabase-js singleton, and any timers all
  // rebuild from scratch. Exposed as a "Having trouble? Reset session"
  // button so users don't need DevTools to recover.
  resetSession: () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k === AUTH_KEY || k === MODE_KEY)
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  },

  socialAuth: async (provider) => {
    if (isSupabaseEnabled) {
      if (provider === 'email') return null;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw new Error(error.message);
      return null;
    }
    currentUser = clone(DEMO_USER);
    authenticated = true;
    writeAuth({ provider });
    notify();
    return currentUser;
  },

  resetPassword: async (email) => {
    if (!email) throw new Error('Enter your email');
    if (isSupabaseEnabled) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (error) throw new Error(error.message);
      return { success: true };
    }
    return { success: true };
  },

  updatePassword: async (newPassword) => {
    if (!isSupabaseEnabled) return { success: true };
    if (!newPassword || newPassword.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Permanent account deletion. Cascades remove the profile, listings,
  // watchlist, notifications, etc. Closings tied to this user are not
  // deleted (FK is RESTRICT) so the function refuses if any are active —
  // the user must complete or refund those first.
  deleteAccount: async () => {
    if (!isSupabaseEnabled) {
      // Demo: simulate a successful deletion + sign-out.
      currentUser = null;
      authenticated = false;
      writeAuth(null);
      notify();
      return { success: true };
    }
    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error) {
      let msg = error.message;
      try {
        const parsed = await error.context?.json();
        if (parsed?.error) msg = parsed.error;
      } catch {}
      throw new Error(msg);
    }
    // Server already deleted the auth user; sign out locally to clear state.
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    try {
      Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
    } catch {}
    currentUser = null;
    authenticated = false;
    notify();
    return data || { success: true };
  },
};

// ── Mode (closer / seller view toggle) ───────────────────────────
const MODE_KEY = 'middleman_mode';
const validMode = (m) => (m === 'closer' || m === 'seller' ? m : 'closer');
let currentMode = validMode(typeof localStorage !== 'undefined' ? localStorage.getItem(MODE_KEY) : 'closer');
export const Mode = {
  get: () => currentMode,
  set: (mode) => {
    const next = validMode(mode);
    if (next === currentMode) return;
    currentMode = next;
    try { localStorage.setItem(MODE_KEY, next); } catch {}
    notify();
  },
  toggle: () => Mode.set(currentMode === 'closer' ? 'seller' : 'closer'),
};

// ── Listings ─────────────────────────────────────────────────────
export const Listings = {
  getAll: () => listings,
  getById: (id) => listings.find(l => l.id === id),

  create: async (data) => {
    if (isSupabaseEnabled) {
      if (!currentUser?.id) throw new Error('Sign in first');
      // 15s timeout so a wedged supabase-js client surfaces a real error
      // instead of trapping the user behind a spinning Post Listing button.
      const { data: row, error } = await withTimeout(
        supabase
          .from('listings')
          .insert({
            seller_id: currentUser.id,
            title: data.title,
            description: data.description || null,
            category: data.category,
            condition: data.condition,
            price_cents: dollarsToCents(data.price),
            commission_bps: pctToBps(data.commission),
            location: data.location || null,
            photos: data.photos || [],
          })
          .select()
          .single(),
        15000,
        'create listing'
      );
      if (error) throw new Error(error.message);
      const ui = dbListingToUi(row);
      listings = [ui, ...listings];
      notify();
      return ui;
    }
    const item = {
      id: 'lst-' + Date.now(), seller_id: currentUser.id,
      ...data, status: 'open', claimed_by: null, claim_start: null, claim_end: null,
      views: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    listings = [item, ...listings];
    notify();
    return item;
  },

  claim: async (listingId) => {
    if (isSupabaseEnabled) {
      const original = listings.find(l => l.id === listingId);
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 86400000);
      const optimistic = original ? {
        ...original,
        status: 'claimed',
        claimed_by: currentUser?.id,
        claim_start: now.toISOString(),
        claim_end: end.toISOString(),
      } : null;
      if (optimistic) {
        listings = listings.map(l => l.id === listingId ? optimistic : l);
        notify();
      }
      try {
        const { data: row, error } = await withTimeout(
          supabase.rpc('claim_listing', { p_listing_id: listingId }),
          12000,
          'claim_listing'
        );
        if (error) throw new Error(error.message);
        const updated = dbListingToUi(Array.isArray(row) ? row[0] : row);
        listings = listings.map(l => l.id === listingId ? updated : l);
        notify();
        return updated;
      } catch (err) {
        if (original) {
          listings = listings.map(l => l.id === listingId ? original : l);
          notify();
        }
        throw err;
      }
    }
    listings = listings.map(l => {
      if (l.id !== listingId || l.status !== 'open') return l;
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 86400000);
      return { ...l, status: 'claimed', claimed_by: currentUser.id, claim_start: now.toISOString(), claim_end: end.toISOString() };
    });
    notify();
    return Listings.getById(listingId);
  },

  extend: async (listingId) => {
    if (isSupabaseEnabled) {
      const { data: row, error } = await withTimeout(
        supabase.rpc('extend_claim', { p_listing_id: listingId }),
        12000,
        'extend_claim'
      );
      if (error) throw new Error(error.message);
      const updated = dbListingToUi(Array.isArray(row) ? row[0] : row);
      listings = listings.map(l => l.id === listingId ? updated : l);
      notify();
      return updated;
    }
    listings = listings.map(l => {
      if (l.id !== listingId || l.claimed_by !== currentUser.id) return l;
      const end = new Date(new Date(l.claim_end).getTime() + 2 * 86400000);
      return { ...l, status: 'negotiating', claim_end: end.toISOString() };
    });
    notify();
    return Listings.getById(listingId);
  },

  markSold: async (listingId) => {
    if (isSupabaseEnabled) {
      const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listingId);
      if (error) console.warn('[Listings] markSold:', error.message);
      listings = listings.map(l => l.id === listingId ? { ...l, status: 'sold' } : l);
      notify();
      return;
    }
    listings = listings.map(l => l.id === listingId ? { ...l, status: 'sold' } : l);
    notify();
  },

  // Closer releases their claim back to the marketplace. Server enforces
  // that no closing is in flight before unwinding. Wrapped in a 12s
  // timeout so a wedged supabase-js client can't trap the UI in an
  // endless spinner — the user gets a real error instead.
  withdraw: async (listingId) => {
    if (isSupabaseEnabled) {
      const { data, error } = await withTimeout(
        supabase.rpc('withdraw_claim', { p_listing_id: listingId }),
        12000,
        'withdraw_claim'
      );
      if (error) throw new Error(error.message);
      const updated = dbListingToUi(Array.isArray(data) ? data[0] : data);
      listings = listings.map(l => l.id === listingId ? updated : l);
      notify();
      return updated;
    }
    listings = listings.map(l => l.id === listingId ? {
      ...l, status: 'open', claimed_by: null, claim_start: null, claim_end: null,
    } : l);
    notify();
  },

  // Seller updates their own listing fields. RLS filters to listings.seller_id = auth.uid()
  // so we don't need extra checks server-side.
  update: async (listingId, updates) => {
    if (isSupabaseEnabled) {
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.condition !== undefined) dbUpdates.condition = updates.condition;
      if (updates.price !== undefined) dbUpdates.price_cents = dollarsToCents(updates.price);
      if (updates.commission !== undefined) dbUpdates.commission_bps = pctToBps(updates.commission);
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
      const { data, error } = await supabase
        .from('listings')
        .update(dbUpdates)
        .eq('id', listingId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const updated = dbListingToUi(data);
      listings = listings.map(l => l.id === listingId ? updated : l);
      notify();
      return updated;
    }
    listings = listings.map(l => l.id === listingId ? { ...l, ...updates, updated_at: new Date().toISOString() } : l);
    notify();
  },

  // Seller deletes their own listing. RLS allows delete only when status='open'
  // (no claim, no closing) — protects against deleting a listing mid-deal.
  remove: async (listingId) => {
    if (isSupabaseEnabled) {
      const { error } = await supabase.from('listings').delete().eq('id', listingId);
      if (error) throw new Error(error.message);
      listings = listings.filter(l => l.id !== listingId);
      notify();
      return;
    }
    listings = listings.filter(l => l.id !== listingId);
    notify();
  },

  incrementViews: async (listingId) => {
    if (isSupabaseEnabled) {
      // Optimistic local bump; server-side authoritative count is best-effort
      // (we don't critically rely on it). RLS lets sellers update their own
      // listings, so this only persists for owners — acceptable for an
      // analytics counter. A proper RPC could be added later.
      listings = listings.map(l => l.id === listingId ? { ...l, views: (l.views || 0) + 1 } : l);
      return;
    }
    listings = listings.map(l => l.id === listingId ? { ...l, views: (l.views || 0) + 1 } : l);
  },
};

// ── Closings ─────────────────────────────────────────────────────
export const Closings = {
  getAll: () => closings,
  getById: (id) => closings.find(c => c.id === id),

  create: async ({ listingId, buyerName, buyerEmail, agreedPrice }) => {
    if (isSupabaseEnabled) {
      // 15s timeout so a wedged client surfaces an error instead of
      // trapping the user on "Generating…" forever.
      const { data: row, error } = await withTimeout(
        supabase.rpc('create_closing', {
          p_listing_id: listingId,
          p_buyer_name: buyerName,
          p_buyer_email: buyerEmail,
          p_agreed_price_cents: dollarsToCents(agreedPrice),
        }),
        15000,
        'create_closing'
      );
      if (error) throw new Error(error.message);
      const ui = dbClosingToUi(Array.isArray(row) ? row[0] : row);
      ui.stripe_checkout_url = `${window.location.origin}/pay/${ui.id}`;
      closings = [ui, ...closings];
      notify();
      // Fire-and-forget the PaymentIntent mint so a slow or failing edge
      // function can't block the closing-create return. The closing row
      // exists at this point; minting can happen lazily when the buyer
      // hits the pay page if it hasn't completed yet.
      callEdgeFunction('stripe-create-payment-intent', { closing_id: ui.id })
        .catch(err => console.warn('[Closings] PaymentIntent mint deferred:', err.message));
      return ui;
    }
    const listing = Listings.getById(listingId);
    if (!listing) throw new Error('Listing not found');
    const closing = {
      id: 'cls-' + Date.now(), listing_id: listingId,
      seller_id: listing.seller_id, closer_id: listing.claimed_by || currentUser.id,
      buyer_name: buyerName, buyer_email: buyerEmail,
      agreed_price: agreedPrice, commission_rate: listing.commission, platform_fee_pct: 4,
      status: 'pending_payment',
      stripe_payment_intent_id: null,
      stripe_checkout_url: 'https://checkout.stripe.com/demo-' + Date.now(),
      created_at: new Date().toISOString(), completed_at: null,
    };
    closings = [closing, ...closings];
    notify();
    return closing;
  },

  // Stripe-driven status transitions stay demo until the Stripe milestone.
  // We persist the status updates to Postgres so they survive reload.
  simulatePayment: async (closingId) => {
    if (isSupabaseEnabled) {
      const { error } = await supabase.from('closings').update({ status: 'paid' }).eq('id', closingId);
      if (error) throw new Error(error.message);
      closings = closings.map(c => c.id === closingId ? { ...c, status: 'paid' } : c);
      notify();
      return;
    }
    closings = closings.map(c => c.id === closingId ? { ...c, status: 'paid' } : c);
    notify();
  },
  confirmHandoff: async (closingId) => {
    if (isSupabaseEnabled) {
      // Verify the row count to catch the case where RLS silently filters the
      // update to zero rows (e.g., user is not seller_id or closer_id).
      const { data, error } = await supabase
        .from('closings')
        .update({ status: 'item_confirmed' })
        .eq('id', closingId)
        .select('id, status');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error('Could not update closing — you may not have permission.');
      }
      closings = closings.map(c => c.id === closingId ? { ...c, status: 'item_confirmed' } : c);
      notify();
      return;
    }
    closings = closings.map(c => c.id === closingId ? { ...c, status: 'item_confirmed' } : c);
    notify();
  },
  complete: async (closingId) => {
    if (isSupabaseEnabled) {
      // Real Stripe path: edge function transfers seller payout + closer
      // commission, then marks the closing completed and the listing sold.
      const result = await callEdgeFunction('stripe-finalize-closing', { closing_id: closingId });
      closings = closings.map(c => c.id === closingId
        ? {
            ...c,
            status: 'completed',
            completed_at: result.completed_at,
          }
        : c);
      const closing = closings.find(c => c.id === closingId);
      if (closing) {
        // Listing was already marked sold in the edge function; sync local cache.
        listings = listings.map(l => l.id === closing.listing_id ? { ...l, status: 'sold' } : l);
      }
      notify();
      return;
    }
    closings = closings.map(c => c.id === closingId ? { ...c, status: 'completed', completed_at: new Date().toISOString() } : c);
    const closing = closings.find(c => c.id === closingId);
    if (closing) Listings.markSold(closing.listing_id);
    notify();
  },
  dispute: async (closingId, reason) => {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase
        .from('closings')
        .update({ status: 'disputed', dispute_reason: reason || null })
        .eq('id', closingId)
        .select('id, status');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error('Could not open dispute — you may not have permission.');
      }
      closings = closings.map(c => c.id === closingId
        ? { ...c, status: 'disputed', dispute_reason: reason || null } : c);
      notify();
      return;
    }
    closings = closings.map(c => c.id === closingId
      ? { ...c, status: 'disputed', dispute_reason: reason || null } : c);
    notify();
  },
};

// ── Chat (Postgres + realtime in Supabase mode; in-memory fallback) ──
export const Chat = {
  getConversations: () => {
    return conversations.map(c => {
      const otherUserId = c.seller_id === currentUser?.id ? c.closer_id : c.seller_id;
      const unread = messages.filter(m =>
        m.conversation_id === c.id && m.sender_id !== currentUser?.id && !m.read
      ).length;
      return {
        ...c,
        otherUser: getProfileFromCache(otherUserId),
        listing: Listings.getById(c.listing_id),
        unreadCount: unread,
      };
    });
  },

  getMessages: (conversationId) => messages.filter(m => m.conversation_id === conversationId),

  sendMessage: async (conversationId, text) => {
    if (!currentUser?.id) throw new Error('Sign in first');
    if (isSupabaseEnabled) {
      const { data: row, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: currentUser.id, text })
        .select()
        .single();
      if (error) throw new Error(error.message);
      // Optimistic local append; realtime INSERT will dedupe via the id check.
      if (!messages.some(m => m.id === row.id)) messages = [...messages, row];
      // The conversation_last_message trigger updates the conversation row;
      // refresh so the inbox reorders. Realtime will also catch this but
      // the awaited refresh keeps the UI snappy.
      loadConversations().then(notify);
      notify();
      return row;
    }
    const msg = {
      id: 'msg-' + Date.now(), conversation_id: conversationId,
      sender_id: currentUser.id, text, read: true, created_at: new Date().toISOString(),
    };
    messages = [...messages, msg];
    conversations = conversations.map(c => c.id === conversationId
      ? { ...c, last_message_text: text, last_message_at: msg.created_at } : c);
    notify();
    return msg;
  },

  markRead: async (conversationId) => {
    if (!currentUser?.id) return;
    if (isSupabaseEnabled) {
      // Mark all unread inbound messages in this conversation as read.
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUser.id)
        .eq('read', false);
      if (error) console.warn('[Chat] markRead:', error.message);
      messages = messages.map(m =>
        (m.conversation_id === conversationId && m.sender_id !== currentUser.id)
          ? { ...m, read: true } : m
      );
      notify();
      return;
    }
    messages = messages.map(m =>
      m.conversation_id === conversationId && m.sender_id !== currentUser?.id ? { ...m, read: true } : m
    );
    notify();
  },

  startConversation: async (listingId, sellerId, closerId) => {
    if (!currentUser?.id) throw new Error('Sign in first');
    // Caller must be one of the parties.
    if (currentUser.id !== sellerId && currentUser.id !== closerId) {
      throw new Error('You must be a party to this conversation');
    }
    if (isSupabaseEnabled) {
      const existing = conversations.find(c =>
        c.listing_id === listingId && c.seller_id === sellerId && c.closer_id === closerId
      );
      if (existing) return existing;
      // Insert with onConflict on the unique (listing_id, seller_id, closer_id)
      // so simultaneous "Start chat" clicks from both parties don't error out.
      const { data: row, error } = await supabase
        .from('conversations')
        .upsert(
          { listing_id: listingId, seller_id: sellerId, closer_id: closerId },
          { onConflict: 'listing_id,seller_id,closer_id', ignoreDuplicates: false }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      if (!conversations.some(c => c.id === row.id)) {
        conversations = [row, ...conversations];
      }
      notify();
      return row;
    }
    const existing = conversations.find(c =>
      c.listing_id === listingId && c.seller_id === sellerId && c.closer_id === closerId
    );
    if (existing) return existing;
    const conv = {
      id: 'conv-' + Date.now(), listing_id: listingId,
      seller_id: sellerId, closer_id: closerId,
      last_message_text: '', last_message_at: new Date().toISOString(),
    };
    conversations = [...conversations, conv];
    notify();
    return conv;
  },

  getTotalUnread: () => {
    return messages.filter(m =>
      m.sender_id !== currentUser?.id && !m.read
    ).length;
  },
};

// ── Reviews ──────────────────────────────────────────────────────
// Airbnb-style mutual reviews with a 21-day double-blind window. The DB
// hides pending reviews from the counterparty via RLS, so anything we
// receive here is either published, authored by the current user, or
// past its 21-day window. The "isPublished" predicate below mirrors
// that rule for derived computations (avg rating, profile counts, etc).
const REVIEW_WINDOW_DAYS = 21;

const isReviewPublished = (r) => {
  if (!r) return false;
  if (r.published_at) return true;
  if (!r.closing_id) return true; // legacy rows with no closing
  const closing = closings.find(c => c.id === r.closing_id);
  if (!closing?.completed_at) return false;
  return new Date(closing.completed_at).getTime() + REVIEW_WINDOW_DAYS * 86400000 < Date.now();
};

export const Reviews = {
  // Public-facing lookups: only published reviews count for profile
  // averages and counts. Pending-but-still-private reviews are filtered
  // out even when the cache happens to hold them (e.g., the viewer is
  // the author).
  getForCloser: (closerId) => reviews.filter(r => r.closer_id === closerId && isReviewPublished(r)),
  getForSeller: (sellerId) => reviews.filter(r => r.seller_id === sellerId && isReviewPublished(r)),

  // The current user's review for a given closing, if any. Useful for
  // dashboards to show "your review is pending" state.
  getMyReviewForClosing: (closingId) =>
    reviews.find(r => r.closing_id === closingId && r.author_id === currentUser?.id) || null,

  // Has the counterparty already reviewed me on this closing? We can only
  // tell this is true if the counterparty's review is visible to us in the
  // cache (which only happens once it publishes — by definition, that
  // means both parties have reviewed, or 21d elapsed).
  counterpartyHasReviewed: (closingId) => {
    if (!currentUser?.id) return false;
    const closing = closings.find(c => c.id === closingId);
    if (!closing) return false;
    const counterparty = closing.seller_id === currentUser.id ? closing.closer_id : closing.seller_id;
    return reviews.some(r => r.closing_id === closingId && r.author_id === counterparty);
  },

  submit: async ({ closingId, stars, text }) => {
    if (isSupabaseEnabled) {
      const { data: row, error } = await supabase.rpc('submit_review', {
        p_closing_id: closingId,
        p_stars: stars,
        p_text: text || null,
      });
      if (error) throw new Error(error.message);
      const ui = dbReviewToUi(Array.isArray(row) ? row[0] : row);
      // The RPC may have flipped published_at on the counterparty's row
      // too — reload to pick that up.
      await loadReviews();
      notify();
      return ui;
    }
    const closing = closings.find(c => c.id === closingId);
    if (!closing) throw new Error('Closing not found');
    const review = {
      id: 'rev-' + Date.now(),
      listing_id: closing.listing_id,
      closing_id: closingId,
      seller_id: closing.seller_id,
      closer_id: closing.closer_id,
      author_id: currentUser?.id,
      stars,
      text,
      created_at: new Date().toISOString(),
      published_at: null,
    };
    reviews = [...reviews, review];
    notify();
    return review;
  },

  // Closings the current user can review right now: completed within the
  // 21-day window, user is a party, user hasn't already submitted one.
  getPendingForMe: () => {
    if (!currentUser?.id) return [];
    const cutoff = Date.now() - REVIEW_WINDOW_DAYS * 86400000;
    return closings.filter(c => {
      if (c.status !== 'completed') return false;
      if (!c.completed_at) return false;
      if (new Date(c.completed_at).getTime() < cutoff) return false;
      const isParty = c.seller_id === currentUser.id || c.closer_id === currentUser.id;
      if (!isParty) return false;
      const mine = reviews.find(r => r.closing_id === c.id && r.author_id === currentUser.id);
      return !mine;
    });
  },

  // Legacy: kept for the seller dashboard's "sold listings without a
  // review yet" prompt. Now delegates to the mutual-review pending list,
  // filtered to closings where the user is the seller.
  getPending: (sellerId) => {
    return Reviews.getPendingForMe().filter(c => c.seller_id === sellerId);
  },

  REVIEW_WINDOW_DAYS,
};

// ── Profile ──────────────────────────────────────────────────────
export const Profile = {
  get: (userId) => getProfileFromCache(userId) || currentUser,
  update: async (data) => {
    if (isSupabaseEnabled && currentUser?.id) {
      const { data: row, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', currentUser.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      currentUser = row;
      cacheProfile(row);
      notify();
      return currentUser;
    }
    currentUser = { ...currentUser, ...data };
    notify();
    return currentUser;
  },
  // Avatar upload. We compress the image client-side to ~400px square
  // and store it as a base64 data URL on profiles.photo_url. This avoids
  // the Supabase Storage transport (which currently hangs in this
  // environment) and keeps the row size modest — a 400px JPEG at q=0.8
  // weighs in around 25-40KB, fine to inline.
  uploadPhoto: async (file) => {
    if (!currentUser?.id) throw new Error('Sign in first');
    const dataUrl = await compressAvatar(file);
    await Profile.update({ photo_url: dataUrl });
    return dataUrl;
  },

  // Best-effort write of last_seen_at so the public-presence dot is
  // accurate. Throttled to once per 5 min and intentionally silent —
  // we don't notify subscribers because presence shouldn't cause
  // unrelated re-renders, and we don't throw on failure because a
  // miss is not user-visible.
  touchLastSeen: async () => {
    if (!isSupabaseEnabled || !currentUser?.id) return;
    const now = Date.now();
    if (Profile._lastTouchAt && now - Profile._lastTouchAt < 5 * 60 * 1000) return;
    Profile._lastTouchAt = now;
    try {
      const iso = new Date(now).toISOString();
      await supabase.from('profiles').update({ last_seen_at: iso }).eq('id', currentUser.id);
      currentUser = { ...currentUser, last_seen_at: iso };
    } catch (err) {
      console.warn('[Profile] touchLastSeen failed:', err);
    }
  },
  _lastTouchAt: 0,
};

// "Active recently" presence: returns true if the profile pinged the
// server within the last 24h. Used for the green dot on profile headers.
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
export function isActiveRecently(profile) {
  if (!profile?.last_seen_at) return false;
  return Date.now() - new Date(profile.last_seen_at).getTime() < ACTIVE_WINDOW_MS;
}

function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const max = 400;
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Watchlist ────────────────────────────────────────────────────
export const Watchlist = {
  get: () => watchlist
    .filter(w => w.user_id === currentUser?.id)
    .map(w => ({ ...w, listing: Listings.getById(w.listing_id) })),
  isInWatchlist: (listingId) => watchlist.some(w => w.user_id === currentUser?.id && w.listing_id === listingId),
  getNotify: (listingId) => watchlist.find(w => w.user_id === currentUser?.id && w.listing_id === listingId)?.notify || false,

  add: async (listingId) => {
    if (Watchlist.isInWatchlist(listingId)) return;
    if (isSupabaseEnabled) {
      if (!currentUser?.id) return;
      const { data: row, error } = await supabase
        .from('watchlist')
        .insert({ user_id: currentUser.id, listing_id: listingId, notify: false })
        .select()
        .single();
      if (error) { console.warn('[Watchlist] add:', error.message); return; }
      watchlist = [...watchlist, row];
      notify();
      return;
    }
    watchlist = [...watchlist, { id: 'wl-' + Date.now(), user_id: currentUser.id, listing_id: listingId, notify: false }];
    notify();
  },

  remove: async (listingId) => {
    if (isSupabaseEnabled) {
      if (!currentUser?.id) return;
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('listing_id', listingId);
      if (error) console.warn('[Watchlist] remove:', error.message);
      watchlist = watchlist.filter(w => !(w.user_id === currentUser.id && w.listing_id === listingId));
      notify();
      return;
    }
    watchlist = watchlist.filter(w => !(w.user_id === currentUser?.id && w.listing_id === listingId));
    notify();
  },

  setNotify: async (listingId, enabled) => {
    if (isSupabaseEnabled) {
      if (!currentUser?.id) return;
      const { error } = await supabase
        .from('watchlist')
        .update({ notify: enabled })
        .eq('user_id', currentUser.id)
        .eq('listing_id', listingId);
      if (error) console.warn('[Watchlist] setNotify:', error.message);
      watchlist = watchlist.map(w =>
        (w.user_id === currentUser.id && w.listing_id === listingId) ? { ...w, notify: enabled } : w
      );
      notify();
      return;
    }
    watchlist = watchlist.map(w =>
      w.user_id === currentUser?.id && w.listing_id === listingId ? { ...w, notify: enabled } : w
    );
    notify();
  },
};

// ── Stripe ───────────────────────────────────────────────────────
// All Stripe operations go through Supabase Edge Functions so the secret key
// never leaves the server. The browser only ever holds the publishable key.
async function callEdgeFunction(name, body = {}) {
  if (!isSupabaseEnabled) throw new Error('Stripe requires Supabase to be configured');
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // supabase-js wraps non-2xx responses; the body lives at error.context.
    let msg = error.message;
    try {
      const parsed = await error.context?.json();
      if (parsed?.error) msg = parsed.error;
    } catch {}
    throw new Error(msg);
  }
  return data;
}

export const Stripe = {
  // Kicks off Connect onboarding. Returns a Stripe-hosted onboarding URL —
  // the caller window.location.assign() to it. After the user completes
  // onboarding, Stripe redirects them back to `return_url`.
  getConnectOnboardingLink: async ({ returnUrl, refreshUrl } = {}) => {
    const data = await callEdgeFunction('stripe-connect-onboard', {
      return_url: returnUrl || `${window.location.origin}/profile`,
      refresh_url: refreshUrl || `${window.location.origin}/profile`,
    });
    return data; // { url, account_id }
  },

  // Returns whether the current user has connected Stripe and is payout-ready.
  // We use a cached field on the profile row; Stripe webhook (account.updated)
  // would be the authoritative source for `payouts_enabled` — wire that next.
  getAccountStatus: () => ({
    connected: !!currentUser?.stripe_account_id,
    enabled: !!currentUser?.stripe_payouts_enabled,
    accountId: currentUser?.stripe_account_id || null,
  }),

  // Closer / seller calls this to mint a PaymentIntent for a closing. Returns
  // the client_secret which the buyer's checkout page uses with Stripe Elements.
  createPaymentIntent: async (closingId) => {
    return callEdgeFunction('stripe-create-payment-intent', { closing_id: closingId });
  },

  // After both parties confirm handoff, this issues the seller + closer
  // transfers and marks the closing complete. Replaces the old
  // Closings.complete demo flow.
  finalizeClosing: async (closingId) => {
    return callEdgeFunction('stripe-finalize-closing', { closing_id: closingId });
  },

  // Public buyer checkout URL for a closing.
  getCheckoutUrl: (closingId) => `${window.location.origin}/pay/${closingId}`,

  // Stripe Express dashboard URL for a connected user. Stripe-hosted, opens
  // in a new tab. The link is generated server-side; for now we just point
  // at the Stripe dashboard root and the user signs in there.
  getDashboardUrl: () => 'https://dashboard.stripe.com/',
};

// ── Badges ───────────────────────────────────────────────────────
// Earned dynamically from the user's activity (no DB column per badge).
// profiles.seen_badges tracks which earned badges the user has already
// been celebrated for, so the congratulations modal fires exactly once.
const BADGE_DEFINITIONS = [
  // Profile-stage milestones
  {
    key: 'profile_pro',
    icon: '✨',
    label: 'Profile Pro',
    description: 'Your profile is 100% complete. People know who they\'re working with.',
    howTo: 'Fill every Profile Completeness item — bio, photo, payouts, first closing, first review.',
    check: (_u, ctx) => ctx.profileCompletePct >= 100,
  },
  {
    key: 'verified',
    icon: '🛡️',
    label: 'Verified',
    description: "Your Stripe payouts are live — buyers can pay through you with confidence.",
    howTo: 'Connect Stripe and finish onboarding from Profile → Settings.',
    check: (u) => Boolean(u?.stripe_payouts_enabled),
  },
  {
    key: 'first_payout',
    icon: '💰',
    label: 'First Payout',
    description: 'First deal completed. The money\'s real now.',
    howTo: 'Complete your first closing — as either the seller or the closer.',
    check: (_u, ctx) => ctx.completedAsParty >= 1,
  },

  // Listing milestones (seller-focused)
  {
    key: 'lister_5',
    icon: '📋',
    label: '5 Listings',
    description: 'You\'ve put five items up for grabs. Inventory is the engine.',
    howTo: 'Post 5 listings.',
    check: (_u, ctx) => ctx.listingsCreated >= 5,
  },
  {
    key: 'lister_50',
    icon: '📚',
    label: '50 Listings',
    description: 'Fifty listings. You run an actual catalog now.',
    howTo: 'Post 50 listings.',
    check: (_u, ctx) => ctx.listingsCreated >= 50,
  },
  {
    key: 'lister_100',
    icon: '👑',
    label: '100 Listings',
    description: 'One hundred listings. Royalty.',
    howTo: 'Post 100 listings.',
    check: (_u, ctx) => ctx.listingsCreated >= 100,
  },

  // Closer-focused
  {
    key: 'top_closer',
    icon: '🏆',
    label: 'Top Closer',
    description: "Ten deals closed. You're not new at this anymore.",
    howTo: 'Complete 10 deals as the closer.',
    check: (_u, ctx) => ctx.completedAsCloser >= 10,
  },
  {
    key: 'fast_responder',
    icon: '⚡',
    label: 'Fast Responder',
    description: 'Your median chat reply is under an hour. Sellers love working with you.',
    howTo: 'Keep your median message response time under 1 hour.',
    check: (_u, ctx) => ctx.medianReplyMinutes != null && ctx.medianReplyMinutes < 60,
  },
  {
    key: 'streak_5',
    icon: '🔥',
    label: '5+ Streak',
    description: 'Five deals in a row, zero disputes. You are on fire.',
    howTo: 'Complete 5 deals in a row without any disputes or refunds.',
    check: (_u, ctx) => ctx.currentStreak >= 5,
  },
  {
    key: 'high_value',
    icon: '💎',
    label: 'High-Value Deals',
    description: 'You closed a deal worth $5,000 or more. Heavy hitter.',
    howTo: 'Complete a deal with an agreed price of $5,000 or higher.',
    check: (_u, ctx) => ctx.maxCompletedPrice >= 5000,
  },
];

// Roll up the activity stats once so each badge's check() is O(1).
function computeBadgeContext() {
  const uid = currentUser?.id;
  if (!uid) {
    return {
      completedAsCloser: 0, completedAsParty: 0, currentStreak: 0,
      maxCompletedPrice: 0, medianReplyMinutes: null,
      listingsCreated: 0, profileCompletePct: 0,
    };
  }
  const myCompleted = closings
    .filter(c => (c.closer_id === uid || c.seller_id === uid) && c.status === 'completed')
    .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));

  const completedAsCloser = closings.filter(c => c.closer_id === uid && c.status === 'completed').length;
  const completedAsParty = myCompleted.length;

  const maxCompletedPrice = myCompleted.reduce((max, c) => Math.max(max, c.agreed_price || 0), 0);

  // Total listings the user has ever posted (any status — including sold).
  const listingsCreated = listings.filter(l => l.seller_id === uid).length;

  // Profile Completeness mirrors the ProfilePage criteria. We compute it
  // here so the Profile Pro badge unlocks the moment the bar hits 100%.
  // "Account Verified" is a placeholder gate in the UI (always true), so
  // it's treated the same way here.
  const myReviewsCount = reviews.filter(r => (r.closer_id === uid || r.seller_id === uid)).length;
  const profileCriteria = [
    Boolean(currentUser?.bio),
    true, // Account Verified placeholder — matches ProfilePage
    completedAsParty >= 1,
    completedAsParty >= 5,
    myReviewsCount > 0,
    Boolean(currentUser?.photo_url),
    Boolean(currentUser?.stripe_payouts_enabled),
  ];
  const profileCompletePct = Math.round(
    (profileCriteria.filter(Boolean).length / profileCriteria.length) * 100
  );

  // Streak: consecutive completed closings (most recent first) with no dispute/refund breaking the chain.
  // We walk both completed and disputed/refunded together to know when the chain breaks.
  const allMine = closings
    .filter(c => c.closer_id === uid || c.seller_id === uid)
    .filter(c => c.status === 'completed' || c.status === 'disputed' || c.status === 'refunded')
    .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at));
  let currentStreak = 0;
  for (const c of allMine) {
    if (c.status === 'completed') currentStreak += 1;
    else break;
  }

  // Median reply time: for each user-sent message, find the immediately preceding
  // inbound message in the same conversation; if any, that's a reply gap.
  const byConv = new Map();
  messages.forEach(m => {
    if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
    byConv.get(m.conversation_id).push(m);
  });
  const gaps = [];
  byConv.forEach(list => {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (let i = 1; i < list.length; i++) {
      const cur = list[i];
      const prev = list[i - 1];
      if (cur.sender_id === uid && prev.sender_id !== uid) {
        const minutes = (new Date(cur.created_at) - new Date(prev.created_at)) / 60000;
        gaps.push(minutes);
      }
    }
  });
  let medianReplyMinutes = null;
  if (gaps.length >= 3) { // require a few data points before the badge applies
    gaps.sort((a, b) => a - b);
    const mid = Math.floor(gaps.length / 2);
    medianReplyMinutes = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  }

  return {
    completedAsCloser, completedAsParty,
    currentStreak, maxCompletedPrice, medianReplyMinutes,
    listingsCreated, profileCompletePct,
  };
}

export const Badges = {
  ALL: BADGE_DEFINITIONS,

  // Returns full badge objects with an `earned: boolean` flag — handy for UI
  // that wants to show every badge, dim the unearned ones, and tooltip the
  // how-to copy.
  state: () => {
    const ctx = computeBadgeContext();
    return BADGE_DEFINITIONS.map(b => ({ ...b, earned: !!b.check(currentUser, ctx) }));
  },

  // Just the earned ones (full badge objects).
  earned: () => Badges.state().filter(b => b.earned),

  // Earned but not yet seen — these are what the congrats modal pops for.
  newlyEarned: () => {
    const seen = new Set(currentUser?.seen_badges || []);
    return Badges.earned().filter(b => !seen.has(b.key));
  },

  // Look up a full badge definition by key. Used by the notifications
  // dropdown so a click on a "badge earned" notification can re-open
  // the celebration modal with the right content.
  byKey: (key) => BADGE_DEFINITIONS.find(b => b.key === key) || null,

  // Persist that the user has now seen these badges so we don't pop
  // the celebration modal again, and drop a notification per badge
  // so the unlock is permanently recorded in the user's inbox.
  markSeen: async (keys) => {
    if (!currentUser?.id || !isSupabaseEnabled || !keys?.length) return;
    const alreadySeen = new Set(currentUser.seen_badges || []);
    const truly_new = keys.filter(k => !alreadySeen.has(k));
    if (!truly_new.length) return;
    const next = Array.from(new Set([...(currentUser.seen_badges || []), ...truly_new]));
    await Profile.update({ seen_badges: next });
    // Best-effort notification inserts — failure here doesn't roll back
    // the celebration (user already saw the modal). RLS allows authenticated
    // self-inserts when type='badge'.
    for (const key of truly_new) {
      const b = Badges.byKey(key);
      if (!b) continue;
      try {
        await supabase.from('notifications').insert({
          user_id: currentUser.id,
          type: 'badge',
          title: `Badge earned: ${b.label}`,
          body: b.description,
          data: { badge_key: b.key, icon: b.icon },
        });
      } catch (err) {
        console.warn('[Badges] notification insert failed:', err);
      }
    }
  },
};

// ── Admin ────────────────────────────────────────────────────────
// Moderation actions for accounts with profile.is_admin = true. All
// privileged work happens inside edge functions (verified server-side).
export const Admin = {
  isAdmin: () => Boolean(currentUser?.is_admin),

  // Deletes the listing and emails the seller with the reason. Reason is
  // a short tag (e.g. "Prohibited item"), custom_message is optional
  // free-text shown to the seller in the email body.
  removeListing: async (listingId, { reason, customMessage } = {}) => {
    const result = await callEdgeFunction('admin-remove-listing', {
      listing_id: listingId,
      reason: reason || null,
      custom_message: customMessage || null,
    });
    // Optimistic local removal so the UI updates instantly; realtime
    // delete event will reconcile from any other tab/session.
    listings = listings.filter(l => l.id !== listingId);
    notify();
    return result;
  },
};

// ── Notifications ────────────────────────────────────────────────
export const Notifications = {
  get: () => notifications.filter(n => n.user_id === currentUser?.id),
  getUnreadCount: () => notifications.filter(n => n.user_id === currentUser?.id && !n.read).length,

  markRead: async (id) => {
    if (isSupabaseEnabled) {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) console.warn('[Notifications] markRead:', error.message);
      notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      notify();
      return;
    }
    notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    notify();
  },
  markAllRead: async () => {
    if (isSupabaseEnabled) {
      if (!currentUser?.id) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);
      if (error) console.warn('[Notifications] markAllRead:', error.message);
      notifications = notifications.map(n => n.user_id === currentUser.id ? { ...n, read: true } : n);
      notify();
      return;
    }
    notifications = notifications.map(n => n.user_id === currentUser?.id ? { ...n, read: true } : n);
    notify();
  },
  clear: async () => {
    if (isSupabaseEnabled) {
      if (!currentUser?.id) return;
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id);
      if (error) console.warn('[Notifications] clear:', error.message);
      notifications = notifications.filter(n => n.user_id !== currentUser.id);
      notify();
      return;
    }
    notifications = notifications.filter(n => n.user_id !== currentUser?.id);
    notify();
  },
  // add() is demo-only; real notifications are inserted server-side by RPCs
  // and arrive via realtime. Kept here for the demo path.
  add: (notif) => {
    if (isSupabaseEnabled) return;
    notifications = [{
      id: 'notif-' + Date.now(), user_id: currentUser?.id, read: false,
      created_at: new Date().toISOString(), ...notif,
    }, ...notifications];
    notify();
  },
};

const Services = { Auth, Mode, Listings, Closings, Chat, Reviews, Profile, Watchlist, Stripe, Notifications, Admin, Badges };
export default Services;
