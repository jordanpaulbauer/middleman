/**
 * MIDDLEMAN Services Layer — React Native / Expo build.
 *
 * Mirrors the web `src/services/index.js` but with all web deps stripped:
 *   - localStorage → AsyncStorage
 *   - window.location.origin → deep links / hosted web URL
 *   - import.meta.env / import.meta.hot → process.env / removed
 *   - File uploads accept { uri, name, type } from expo-image-picker
 *
 * Reads stay synchronous (per-table cache). Writes await Supabase + realtime
 * keeps the cache in sync. UI subscribes via `subscribe(fn)`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { webUrl, deepLink } from './config';

// ── State ────────────────────────────────────────────────────────
let listings = [];
let closings = [];
let conversations = [];
let messages = [];
let reviews = [];
let watchlist = [];
let notifications = [];
let profilesById = {};
let currentUser = null;
let authenticated = false;

const listeners = new Set();
function notify() { listeners.forEach(fn => fn()); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ── Mappers: Postgres ↔ UI ───────────────────────────────────────
const bpsToPct = (bps) => Math.round((bps || 0) / 100);
const pctToBps = (pct) => Math.round((pct || 0) * 100);
const centsToDollars = (cents) => Math.round((cents || 0) / 100);
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
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

function dbReviewToUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    listing_id: row.listing_id,
    seller_id: row.seller_id,
    closer_id: row.closer_id,
    stars: row.stars,
    text: row.text,
    created_at: row.created_at,
  };
}

function cacheProfile(p) { if (p?.id) profilesById[p.id] = p; }
function getProfileFromCache(id) { return profilesById[id] || null; }

// ── Profile + cache loaders ──────────────────────────────────────
async function loadProfileFromSupabase(authUserId) {
  if (!authUserId) return null;
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

async function loadListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Listings] load:', error.message); return; }
  listings = (data || []).map(dbListingToUi);
  const ids = new Set();
  data?.forEach(r => { if (r.seller_id) ids.add(r.seller_id); if (r.claimed_by) ids.add(r.claimed_by); });
  await loadProfilesByIds([...ids]);
}

async function loadClosings() {
  if (!currentUser?.id) return;
  const { data, error } = await supabase
    .from('closings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Closings] load:', error.message); return; }
  closings = (data || []).map(dbClosingToUi);
}

async function loadWatchlist() {
  if (!currentUser?.id) { watchlist = []; return; }
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', currentUser.id);
  if (error) { console.warn('[Watchlist] load:', error.message); return; }
  watchlist = data || [];
}

async function loadNotifications() {
  if (!currentUser?.id) { notifications = []; return; }
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Notifications] load:', error.message); return; }
  notifications = data || [];
}

async function loadReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Reviews] load:', error.message); return; }
  reviews = (data || []).map(dbReviewToUi);
}

async function loadConversations() {
  if (!currentUser?.id) { conversations = []; return; }
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false });
  if (error) { console.warn('[Conversations] load:', error.message); return; }
  conversations = data || [];
  const ids = new Set();
  conversations.forEach(c => { ids.add(c.seller_id); ids.add(c.closer_id); });
  await loadProfilesByIds([...ids]);
}

async function loadMessages() {
  if (!currentUser?.id) { messages = []; return; }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.warn('[Messages] load:', error.message); return; }
  messages = data || [];
}

async function loadProfilesByIds(ids) {
  if (!ids?.length) return;
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
    loadListings(), loadClosings(), loadWatchlist(),
    loadNotifications(), loadReviews(), loadConversations(), loadMessages(),
  ]);
  notify();
}

// ── Realtime ─────────────────────────────────────────────────────
let realtimeChannel = null;
function startRealtime() {
  if (realtimeChannel) return;
  const channelName = `middleman-data-${Math.random().toString(36).slice(2, 8)}`;
  realtimeChannel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => loadListings().then(notify))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'closings' }, () => loadClosings().then(notify))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => loadReviews().then(notify))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, () => loadWatchlist().then(notify))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => loadNotifications().then(notify))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const m = payload.new;
      if (m && !messages.some(x => x.id === m.id)) messages = [...messages, m];
      loadConversations().then(notify);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
      const m = payload.new;
      if (!m) return;
      messages = messages.map(x => x.id === m.id ? m : x);
      notify();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConversations().then(notify))
    .subscribe();
}

// ── Auth bootstrap ───────────────────────────────────────────────
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = await loadProfileFromSupabase(session.user.id);
    authenticated = !!currentUser;
    cacheProfile(currentUser);
    await refreshAll();
    startRealtime();
  } else {
    await loadListings();
    notify();
  }
})();

supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    currentUser = await loadProfileFromSupabase(session.user.id);
    authenticated = !!currentUser;
    cacheProfile(currentUser);
    await refreshAll();
    startRealtime();
  } else {
    currentUser = null;
    authenticated = false;
    watchlist = []; notifications = []; closings = [];
    conversations = []; messages = [];
  }
  notify();
});

// ── Auth ─────────────────────────────────────────────────────────
export const Auth = {
  getUser: () => (authenticated ? currentUser : null),
  isAuthenticated: () => authenticated,

  login: async (email, password) => {
    if (!email || !password) throw new Error('Email and password are required');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    currentUser = await loadProfileFromSupabase(data.user.id);
    authenticated = !!currentUser;
    cacheProfile(currentUser);
    notify();
    return currentUser;
  },

  register: async ({ email, full_name, password }) => {
    if (!email || !full_name) throw new Error('Name and email are required');
    if (!password || password.length < 4) throw new Error('Password must be at least 4 characters');
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name },
        emailRedirectTo: deepLink('auth/verify'),
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error('Account created — check your email to confirm before signing in.');
    }
    currentUser = await loadProfileFromSupabase(data.user.id);
    authenticated = !!currentUser;
    cacheProfile(currentUser);
    notify();
    return currentUser;
  },

  logout: async () => {
    currentUser = null;
    authenticated = false;
    notify();
    try { await supabase.auth.signOut({ scope: 'local' }); }
    catch (err) { console.warn('[Auth] local signOut error (ignored):', err); }
    supabase.auth.signOut({ scope: 'global' }).catch(() => {});
  },

  // OAuth on mobile uses expo-auth-session or expo-web-browser to open the
  // Supabase /authorize URL in a browser tab and handle the deep-link return.
  // Returns the URL to open. Caller is responsible for opening it via
  // WebBrowser.openAuthSessionAsync(url, deepLink('auth/callback')).
  socialAuthUrl: async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: deepLink('auth/callback'),
        skipBrowserRedirect: true,
      },
    });
    if (error) throw new Error(error.message);
    return data.url;
  },

  // Call after WebBrowser returns with a deep-link URL containing access_token.
  exchangeCodeForSession: async (url) => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(url);
    if (error) throw new Error(error.message);
    return data;
  },

  resetPassword: async (email) => {
    if (!email) throw new Error('Enter your email');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: deepLink('auth/reset'),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  updatePassword: async (newPassword) => {
    if (!newPassword || newPassword.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  deleteAccount: async () => {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error) {
      let msg = error.message;
      try {
        const parsed = await error.context?.json();
        if (parsed?.error) msg = parsed.error;
      } catch {}
      throw new Error(msg);
    }
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    currentUser = null;
    authenticated = false;
    notify();
    return data || { success: true };
  },
};

// ── Mode (closer / seller) ───────────────────────────────────────
const MODE_KEY = 'middleman_mode';
let currentMode = 'closer';
const validMode = (m) => (m === 'closer' || m === 'seller' ? m : 'closer');
// Restore persisted mode asynchronously on boot.
AsyncStorage.getItem(MODE_KEY).then(v => {
  if (v) { currentMode = validMode(v); notify(); }
}).catch(() => {});

export const Mode = {
  get: () => currentMode,
  set: (mode) => {
    const next = validMode(mode);
    if (next === currentMode) return;
    currentMode = next;
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
    notify();
  },
  toggle: () => Mode.set(currentMode === 'closer' ? 'seller' : 'closer'),
};

// ── Listings ─────────────────────────────────────────────────────
export const Listings = {
  getAll: () => listings,
  getById: (id) => listings.find(l => l.id === id),

  create: async (data) => {
    if (!currentUser?.id) throw new Error('Sign in first');
    const { data: row, error } = await supabase
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
      .single();
    if (error) throw new Error(error.message);
    const ui = dbListingToUi(row);
    listings = [ui, ...listings];
    notify();
    return ui;
  },

  // Optimistic claim: updates cache before the RPC roundtrip so the
  // closer dashboard reflects the new state immediately. Reverts on error.
  claim: async (listingId) => {
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
      const { data: row, error } = await supabase.rpc('claim_listing', { p_listing_id: listingId });
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
  },

  extend: async (listingId) => {
    const { data: row, error } = await supabase.rpc('extend_claim', { p_listing_id: listingId });
    if (error) throw new Error(error.message);
    const updated = dbListingToUi(Array.isArray(row) ? row[0] : row);
    listings = listings.map(l => l.id === listingId ? updated : l);
    notify();
    return updated;
  },

  markSold: async (listingId) => {
    const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listingId);
    if (error) console.warn('[Listings] markSold:', error.message);
    listings = listings.map(l => l.id === listingId ? { ...l, status: 'sold' } : l);
    notify();
  },

  withdraw: async (listingId) => {
    const { data, error } = await supabase.rpc('withdraw_claim', { p_listing_id: listingId });
    if (error) throw new Error(error.message);
    const updated = dbListingToUi(Array.isArray(data) ? data[0] : data);
    listings = listings.map(l => l.id === listingId ? updated : l);
    notify();
    return updated;
  },

  update: async (listingId, updates) => {
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
  },

  remove: async (listingId) => {
    const { error } = await supabase.from('listings').delete().eq('id', listingId);
    if (error) throw new Error(error.message);
    listings = listings.filter(l => l.id !== listingId);
    notify();
  },

  incrementViews: async (listingId) => {
    listings = listings.map(l => l.id === listingId ? { ...l, views: (l.views || 0) + 1 } : l);
  },
};

// ── Closings ─────────────────────────────────────────────────────
export const Closings = {
  getAll: () => closings,
  getById: (id) => closings.find(c => c.id === id),

  create: async ({ listingId, buyerName, buyerEmail, agreedPrice }) => {
    const { data: row, error } = await supabase.rpc('create_closing', {
      p_listing_id: listingId,
      p_buyer_name: buyerName,
      p_buyer_email: buyerEmail,
      p_agreed_price_cents: dollarsToCents(agreedPrice),
    });
    if (error) throw new Error(error.message);
    const ui = dbClosingToUi(Array.isArray(row) ? row[0] : row);
    // Buyer pays via the hosted web checkout. Mobile builds can also adopt
    // Stripe's PaymentSheet (createPaymentIntent + presentPaymentSheet),
    // but the hosted URL keeps things simple to start.
    ui.stripe_checkout_url = webUrl(`/pay/${ui.id}`);
    closings = [ui, ...closings];
    notify();
    try {
      await callEdgeFunction('stripe-create-payment-intent', { closing_id: ui.id });
    } catch (err) {
      console.warn('[Closings] PaymentIntent mint deferred:', err.message);
    }
    return ui;
  },

  simulatePayment: async (closingId) => {
    const { error } = await supabase.from('closings').update({ status: 'paid' }).eq('id', closingId);
    if (error) throw new Error(error.message);
    closings = closings.map(c => c.id === closingId ? { ...c, status: 'paid' } : c);
    notify();
  },

  confirmHandoff: async (closingId) => {
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
  },

  complete: async (closingId) => {
    const result = await callEdgeFunction('stripe-finalize-closing', { closing_id: closingId });
    closings = closings.map(c => c.id === closingId
      ? { ...c, status: 'completed', completed_at: result.completed_at }
      : c);
    const closing = closings.find(c => c.id === closingId);
    if (closing) {
      listings = listings.map(l => l.id === closing.listing_id ? { ...l, status: 'sold' } : l);
    }
    notify();
  },

  dispute: async (closingId, reason) => {
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
  },
};

// ── Chat ─────────────────────────────────────────────────────────
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
    const { data: row, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: currentUser.id, text })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (!messages.some(m => m.id === row.id)) messages = [...messages, row];
    loadConversations().then(notify);
    notify();
    return row;
  },

  markRead: async (conversationId) => {
    if (!currentUser?.id) return;
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
  },

  startConversation: async (listingId, sellerId, closerId) => {
    if (!currentUser?.id) throw new Error('Sign in first');
    if (currentUser.id !== sellerId && currentUser.id !== closerId) {
      throw new Error('You must be a party to this conversation');
    }
    const existing = conversations.find(c =>
      c.listing_id === listingId && c.seller_id === sellerId && c.closer_id === closerId
    );
    if (existing) return existing;
    const { data: row, error } = await supabase
      .from('conversations')
      .upsert(
        { listing_id: listingId, seller_id: sellerId, closer_id: closerId },
        { onConflict: 'listing_id,seller_id,closer_id', ignoreDuplicates: false }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (!conversations.some(c => c.id === row.id)) conversations = [row, ...conversations];
    notify();
    return row;
  },

  getTotalUnread: () =>
    messages.filter(m => m.sender_id !== currentUser?.id && !m.read).length,
};

// ── Reviews ──────────────────────────────────────────────────────
export const Reviews = {
  getForCloser: (closerId) => reviews.filter(r => r.closer_id === closerId),
  getForSeller: (sellerId) => reviews.filter(r => r.seller_id === sellerId),

  submit: async ({ listingId, sellerId, closerId, stars, text }) => {
    const { data: row, error } = await supabase
      .from('reviews')
      .insert({ listing_id: listingId, seller_id: sellerId, closer_id: closerId, stars, text })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const ui = dbReviewToUi(row);
    reviews = [ui, ...reviews];
    notify();
    return ui;
  },

  getPending: (sellerId) => {
    const soldListings = listings.filter(l => l.seller_id === sellerId && l.status === 'sold');
    return soldListings.filter(l => !reviews.find(r => r.listing_id === l.id && r.seller_id === sellerId));
  },
};

// ── Profile ──────────────────────────────────────────────────────
export const Profile = {
  get: (userId) => getProfileFromCache(userId) || currentUser,

  update: async (data) => {
    if (!currentUser?.id) return null;
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
  },

  // Mobile photo input shape: { uri, name, type } from expo-image-picker.
  // We fetch the local URI, convert to a Blob, then upload to storage.
  uploadPhoto: async (asset) => {
    if (!currentUser?.id) return null;
    const ext = (asset.name?.split('.').pop() || 'jpg').toLowerCase();
    const path = `${currentUser.id}/avatar-${Date.now()}.${ext}`;
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType: asset.type || 'image/jpeg', upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = pub.publicUrl;
    await Profile.update({ photo_url: url });
    return url;
  },
};

// ── Watchlist ────────────────────────────────────────────────────
export const Watchlist = {
  get: () => watchlist
    .filter(w => w.user_id === currentUser?.id)
    .map(w => ({ ...w, listing: Listings.getById(w.listing_id) })),
  isInWatchlist: (listingId) =>
    watchlist.some(w => w.user_id === currentUser?.id && w.listing_id === listingId),
  getNotify: (listingId) =>
    watchlist.find(w => w.user_id === currentUser?.id && w.listing_id === listingId)?.notify || false,

  add: async (listingId) => {
    if (Watchlist.isInWatchlist(listingId)) return;
    if (!currentUser?.id) return;
    const { data: row, error } = await supabase
      .from('watchlist')
      .insert({ user_id: currentUser.id, listing_id: listingId, notify: false })
      .select()
      .single();
    if (error) { console.warn('[Watchlist] add:', error.message); return; }
    watchlist = [...watchlist, row];
    notify();
  },

  remove: async (listingId) => {
    if (!currentUser?.id) return;
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('listing_id', listingId);
    if (error) console.warn('[Watchlist] remove:', error.message);
    watchlist = watchlist.filter(w => !(w.user_id === currentUser.id && w.listing_id === listingId));
    notify();
  },

  setNotify: async (listingId, enabled) => {
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
  },
};

// ── Stripe ───────────────────────────────────────────────────────
async function callEdgeFunction(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
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
  // Returns the Stripe-hosted onboarding URL. Caller opens it via
  // WebBrowser.openAuthSessionAsync(url, deepLink('profile')).
  getConnectOnboardingLink: async ({ returnUrl, refreshUrl } = {}) => {
    const data = await callEdgeFunction('stripe-connect-onboard', {
      return_url: returnUrl || deepLink('profile'),
      refresh_url: refreshUrl || deepLink('profile'),
    });
    return data; // { url, account_id }
  },

  getAccountStatus: () => ({
    connected: !!currentUser?.stripe_account_id,
    enabled: !!currentUser?.stripe_payouts_enabled,
    accountId: currentUser?.stripe_account_id || null,
  }),

  createPaymentIntent: async (closingId) => {
    return callEdgeFunction('stripe-create-payment-intent', { closing_id: closingId });
  },

  finalizeClosing: async (closingId) => {
    return callEdgeFunction('stripe-finalize-closing', { closing_id: closingId });
  },

  // Hosted buyer checkout URL (web). For native PaymentSheet, instead call
  // createPaymentIntent and pass clientSecret to @stripe/stripe-react-native.
  getCheckoutUrl: (closingId) => webUrl(`/pay/${closingId}`),

  getDashboardUrl: () => 'https://dashboard.stripe.com/',
};

// ── Notifications ────────────────────────────────────────────────
export const Notifications = {
  get: () => notifications.filter(n => n.user_id === currentUser?.id),
  getUnreadCount: () => notifications.filter(n => n.user_id === currentUser?.id && !n.read).length,

  markRead: async (id) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.warn('[Notifications] markRead:', error.message);
    notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    notify();
  },

  markAllRead: async () => {
    if (!currentUser?.id) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .eq('read', false);
    if (error) console.warn('[Notifications] markAllRead:', error.message);
    notifications = notifications.map(n => n.user_id === currentUser.id ? { ...n, read: true } : n);
    notify();
  },

  clear: async () => {
    if (!currentUser?.id) return;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', currentUser.id);
    if (error) console.warn('[Notifications] clear:', error.message);
    notifications = notifications.filter(n => n.user_id !== currentUser.id);
    notify();
  },
};

const Services = { Auth, Mode, Listings, Closings, Chat, Reviews, Profile, Watchlist, Stripe, Notifications };
export default Services;
