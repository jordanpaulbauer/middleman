/**
 * MIDDLEMAN Services Layer
 * All UI calls go through here — never call Supabase/Stripe directly.
 * In demo mode, returns mock data. In prod, swap to real API calls.
 */
import {
  DEMO_USER, DEMO_USERS, DEMO_LISTINGS, DEMO_CLOSINGS,
  DEMO_CONVERSATIONS, DEMO_MESSAGES, DEMO_REVIEWS,
  DEMO_WATCHLIST, DEMO_NOTIFICATIONS, getUserById,
} from '../data/demo';

// Deep clone helper
const clone = (d) => JSON.parse(JSON.stringify(d));

// In-memory state for demo mode (mutated by actions)
let listings = clone(DEMO_LISTINGS);
let closings = clone(DEMO_CLOSINGS);
let conversations = clone(DEMO_CONVERSATIONS);
let messages = clone(DEMO_MESSAGES);
let reviews = clone(DEMO_REVIEWS);
let watchlist = clone(DEMO_WATCHLIST);
let notifications = clone(DEMO_NOTIFICATIONS);
let currentUser = clone(DEMO_USER);

// Subscribers for state changes
const listeners = new Set();
function notify() { listeners.forEach(fn => fn()); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ── Auth ──
export const Auth = {
  getUser: () => currentUser,
  login: async (email, password) => { currentUser = clone(DEMO_USER); notify(); return currentUser; },
  register: async (data) => { currentUser = { ...clone(DEMO_USER), ...data }; notify(); return currentUser; },
  logout: async () => { currentUser = null; notify(); },
  socialAuth: async (provider) => { currentUser = clone(DEMO_USER); notify(); return currentUser; },
  resetPassword: async (email) => ({ success: true }),
};

// ── Listings ──
export const Listings = {
  getAll: () => listings,
  getById: (id) => listings.find(l => l.id === id),
  create: async (data) => {
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
    listings = listings.map(l => {
      if (l.id !== listingId || l.claimed_by !== currentUser.id) return l;
      const end = new Date(new Date(l.claim_end).getTime() + 2 * 86400000);
      return { ...l, status: 'negotiating', claim_end: end.toISOString() };
    });
    notify();
    return Listings.getById(listingId);
  },
  markSold: async (listingId) => {
    listings = listings.map(l => l.id === listingId ? { ...l, status: 'sold' } : l);
    notify();
  },
  incrementViews: (listingId) => {
    listings = listings.map(l => l.id === listingId ? { ...l, views: (l.views || 0) + 1 } : l);
  },
};

// ── Closings ──
export const Closings = {
  getAll: () => closings,
  getById: (id) => closings.find(c => c.id === id),
  create: async ({ listingId, buyerName, buyerEmail, agreedPrice }) => {
    const listing = Listings.getById(listingId);
    if (!listing) throw new Error('Listing not found');
    const closing = {
      id: 'cls-' + Date.now(), listing_id: listingId,
      seller_id: listing.seller_id, closer_id: listing.claimed_by || currentUser.id,
      buyer_name: buyerName, buyer_email: buyerEmail,
      agreed_price: agreedPrice, commission_rate: listing.commission, platform_fee_pct: 4,
      status: 'pending_payment',
      stripe_payment_intent_id: null, stripe_checkout_url: 'https://checkout.stripe.com/demo-' + Date.now(),
      created_at: new Date().toISOString(), completed_at: null,
    };
    closings = [closing, ...closings];
    notify();
    return closing;
  },
  simulatePayment: async (closingId) => {
    closings = closings.map(c => c.id === closingId ? { ...c, status: 'paid' } : c);
    notify();
  },
  confirmHandoff: async (closingId) => {
    closings = closings.map(c => c.id === closingId ? { ...c, status: 'item_confirmed' } : c);
    notify();
  },
  complete: async (closingId) => {
    closings = closings.map(c => c.id === closingId ? { ...c, status: 'completed', completed_at: new Date().toISOString() } : c);
    // Also mark listing as sold
    const closing = closings.find(c => c.id === closingId);
    if (closing) Listings.markSold(closing.listing_id);
    notify();
  },
  dispute: async (closingId) => {
    closings = closings.map(c => c.id === closingId ? { ...c, status: 'disputed' } : c);
    notify();
  },
};

// ── Chat ──
export const Chat = {
  getConversations: () => {
    return conversations.map(c => {
      const otherUserId = c.seller_id === currentUser?.id ? c.closer_id : c.seller_id;
      const unread = messages.filter(m => m.conversation_id === c.id && m.sender_id !== currentUser?.id && !m.read).length;
      return { ...c, otherUser: getUserById(otherUserId), listing: Listings.getById(c.listing_id), unreadCount: unread };
    });
  },
  getMessages: (conversationId) => messages.filter(m => m.conversation_id === conversationId),
  sendMessage: async (conversationId, text) => {
    const msg = {
      id: 'msg-' + Date.now(), conversation_id: conversationId,
      sender_id: currentUser.id, text, read: true, created_at: new Date().toISOString(),
    };
    messages = [...messages, msg];
    conversations = conversations.map(c => c.id === conversationId ? { ...c, last_message_text: text, last_message_at: msg.created_at } : c);
    notify();
    return msg;
  },
  markRead: async (conversationId) => {
    messages = messages.map(m =>
      m.conversation_id === conversationId && m.sender_id !== currentUser?.id ? { ...m, read: true } : m
    );
    notify();
  },
  startConversation: async (listingId, sellerId, closerId) => {
    const existing = conversations.find(c => c.listing_id === listingId && c.seller_id === sellerId && c.closer_id === closerId);
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
    return messages.filter(m => m.sender_id !== currentUser?.id && !m.read).length;
  },
};

// ── Reviews ──
export const Reviews = {
  getForCloser: (closerId) => reviews.filter(r => r.closer_id === closerId),
  getForSeller: (sellerId) => reviews.filter(r => r.seller_id === sellerId),
  submit: async ({ listingId, sellerId, closerId, stars, text }) => {
    const review = {
      id: 'rev-' + Date.now(), listing_id: listingId,
      seller_id: sellerId, closer_id: closerId,
      stars, text, created_at: new Date().toISOString(),
    };
    reviews = [...reviews, review];
    notify();
    return review;
  },
  getPending: (sellerId) => {
    const soldListings = listings.filter(l => l.seller_id === sellerId && l.status === 'sold');
    return soldListings.filter(l => !reviews.find(r => r.listing_id === l.id && r.seller_id === sellerId));
  },
};

// ── Profile ──
export const Profile = {
  get: (userId) => getUserById(userId) || currentUser,
  update: async (data) => { currentUser = { ...currentUser, ...data }; notify(); return currentUser; },
  uploadPhoto: async (file) => {
    const url = URL.createObjectURL(file);
    currentUser = { ...currentUser, photo_url: url };
    notify();
    return url;
  },
};

// ── Watchlist ──
export const Watchlist = {
  get: () => watchlist.filter(w => w.user_id === currentUser?.id).map(w => ({ ...w, listing: Listings.getById(w.listing_id) })),
  isInWatchlist: (listingId) => watchlist.some(w => w.user_id === currentUser?.id && w.listing_id === listingId),
  add: async (listingId) => {
    if (Watchlist.isInWatchlist(listingId)) return;
    watchlist = [...watchlist, { id: 'wl-' + Date.now(), user_id: currentUser.id, listing_id: listingId, notify: false }];
    notify();
  },
  remove: async (listingId) => {
    watchlist = watchlist.filter(w => !(w.user_id === currentUser?.id && w.listing_id === listingId));
    notify();
  },
  setNotify: async (listingId, enabled) => {
    watchlist = watchlist.map(w =>
      w.user_id === currentUser?.id && w.listing_id === listingId ? { ...w, notify: enabled } : w
    );
    notify();
  },
  getNotify: (listingId) => watchlist.find(w => w.user_id === currentUser?.id && w.listing_id === listingId)?.notify || false,
};

// ── Stripe (demo stubs) ──
export const Stripe = {
  getConnectUrl: () => 'https://connect.stripe.com/setup/demo',
  getAccountStatus: () => ({ enabled: currentUser?.stripe_payouts_enabled }),
  getDashboardUrl: () => 'https://dashboard.stripe.com/demo',
};

// ── Notifications ──
export const Notifications = {
  get: () => notifications.filter(n => n.user_id === currentUser?.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  getUnreadCount: () => notifications.filter(n => n.user_id === currentUser?.id && !n.read).length,
  markRead: async (id) => {
    notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    notify();
  },
  markAllRead: async () => {
    notifications = notifications.map(n => n.user_id === currentUser?.id ? { ...n, read: true } : n);
    notify();
  },
  clear: async () => {
    notifications = notifications.filter(n => n.user_id !== currentUser?.id);
    notify();
  },
  add: (notif) => {
    notifications = [{ id: 'notif-' + Date.now(), user_id: currentUser?.id, read: false, created_at: new Date().toISOString(), ...notif }, ...notifications];
    notify();
  },
};

const Services = { Auth, Listings, Closings, Chat, Reviews, Profile, Watchlist, Stripe, Notifications };
export default Services;
