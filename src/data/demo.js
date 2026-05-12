// Demo data for MIDDLEMAN - all UI can be built against this

export const DEMO_USER = {
  id: 'user-1',
  email: 'jordan@middleman.io',
  full_name: 'Jordan Bauer',
  role: 'both',
  bio: 'Full-stack closer. Specializing in real estate, industrial equipment, and luxury vehicles. Let me move your inventory.',
  photo_url: null,
  phone: '+1 (555) 123-4567',
  location: 'Los Angeles, CA',
  joined_at: '2024-09-15T00:00:00Z',
  stripe_account_id: 'acct_demo123',
  stripe_payouts_enabled: true,
  settings: { notifications: true, emailAlerts: true, publicProfile: true },
};

export const DEMO_USERS = [
  DEMO_USER,
  { id: 'user-2', full_name: 'Marcus Rivera', role: 'seller', photo_url: null, location: 'Miami, FL', bio: 'Industrial equipment dealer.', joined_at: '2024-10-01T00:00:00Z', stripe_payouts_enabled: true },
  { id: 'user-3', full_name: 'Sarah Chen', role: 'closer', photo_url: null, location: 'New York, NY', bio: 'Top closer in electronics and collectibles.', joined_at: '2024-11-10T00:00:00Z', stripe_payouts_enabled: true },
  { id: 'user-4', full_name: 'Alex Thompson', role: 'both', photo_url: null, location: 'Austin, TX', bio: 'Vehicle specialist.', joined_at: '2025-01-05T00:00:00Z', stripe_payouts_enabled: false },
  { id: 'user-5', full_name: 'Diana Park', role: 'seller', photo_url: null, location: 'Seattle, WA', bio: 'Luxury goods and fashion.', joined_at: '2025-02-14T00:00:00Z', stripe_payouts_enabled: true },
];

const now = Date.now();
const hour = 3600000;
const day = 86400000;

export const DEMO_LISTINGS = [
  {
    id: 'lst-1', seller_id: 'user-2', title: '2019 Caterpillar 320 Excavator',
    description: 'Low hours, well-maintained CAT 320 excavator. Full service records available. Excellent condition for its age.',
    category: 'Industrial', condition: 'Good', location: 'Miami, FL',
    price: 87000, commission: 12, photos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=450&fit=crop'],
    status: 'open', claimed_by: null, claim_start: null, claim_end: null, views: 342, created_at: new Date(now - 5 * day).toISOString(),
  },
  {
    id: 'lst-2', seller_id: 'user-5', title: 'Hermès Birkin 30 — Gold Togo',
    description: 'Authentic Hermès Birkin 30 in Gold Togo leather with gold hardware. Includes box, dust bag, and receipt. Pristine condition.',
    category: 'Fashion', condition: 'Excellent', location: 'Seattle, WA',
    price: 24500, commission: 8, photos: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=450&fit=crop'],
    status: 'open', claimed_by: null, claim_start: null, claim_end: null, views: 891, created_at: new Date(now - 3 * day).toISOString(),
  },
  {
    id: 'lst-3', seller_id: 'user-2', title: 'Commercial Property — Downtown Warehouse',
    description: '12,000 sq ft warehouse in downtown Miami. Zoned commercial/industrial. Loading docks, office space, ample parking.',
    category: 'Real Estate', condition: 'Good', location: 'Miami, FL',
    price: 1250000, commission: 5, photos: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=450&fit=crop'],
    status: 'claimed', claimed_by: 'user-1', claim_start: new Date(now - 2 * day).toISOString(), claim_end: new Date(now + 5 * day).toISOString(), views: 567, created_at: new Date(now - 10 * day).toISOString(),
  },
  {
    id: 'lst-4', seller_id: 'user-4', title: '2022 Porsche 911 GT3',
    description: 'Shark Blue over black leather. PDK transmission. Front axle lift. Full PPF. 3,200 miles. Clean title.',
    category: 'Vehicles', condition: 'Excellent', location: 'Austin, TX',
    price: 219000, commission: 6, photos: ['https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&h=450&fit=crop'],
    status: 'claimed', claimed_by: 'user-3', claim_start: new Date(now - 5 * day).toISOString(), claim_end: new Date(now + 1.5 * day).toISOString(), views: 1203, created_at: new Date(now - 12 * day).toISOString(),
  },
  {
    id: 'lst-5', seller_id: 'user-2', title: 'Vintage Rolex Submariner 5513',
    description: '1968 Rolex Submariner reference 5513. Meters-first dial. Original patina. Recently serviced. Box and papers.',
    category: 'Collectibles', condition: 'Fair', location: 'Miami, FL',
    price: 32000, commission: 10, photos: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=450&fit=crop'],
    status: 'open', claimed_by: null, claim_start: null, claim_end: null, views: 445, created_at: new Date(now - 7 * day).toISOString(),
  },
  {
    id: 'lst-6', seller_id: 'user-5', title: 'Restaurant Equipment Package — Full Kitchen',
    description: 'Complete commercial kitchen package. Walk-in cooler, 6-burner range, fryer, prep tables, hood system. Previously used in upscale dining.',
    category: 'Equipment', condition: 'Good', location: 'Seattle, WA',
    price: 45000, commission: 15, photos: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=450&fit=crop'],
    status: 'open', claimed_by: null, claim_start: null, claim_end: null, views: 178, created_at: new Date(now - 1 * day).toISOString(),
  },
  {
    id: 'lst-7', seller_id: 'user-4', title: 'Tesla Model X Plaid 2023',
    description: 'White exterior, cream interior. Full self-driving capability. 8,100 miles. One owner, garage kept.',
    category: 'Vehicles', condition: 'Excellent', location: 'Austin, TX',
    price: 89000, commission: 7, photos: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600&h=450&fit=crop'],
    status: 'open', claimed_by: null, claim_start: null, claim_end: null, views: 623, created_at: new Date(now - 2 * day).toISOString(),
  },
  {
    id: 'lst-8', seller_id: 'user-2', title: 'CNC Milling Machine — Haas VF-2',
    description: 'Haas VF-2 vertical machining center. 2020 model. Low run hours. 4th axis ready. Includes tooling package.',
    category: 'Industrial', condition: 'Excellent', location: 'Miami, FL',
    price: 62000, commission: 10, photos: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=450&fit=crop'],
    status: 'sold', claimed_by: 'user-1', claim_start: null, claim_end: null, views: 289, created_at: new Date(now - 30 * day).toISOString(),
  },
  {
    id: 'lst-9', seller_id: 'user-5', title: 'Craft Brewery Equipment — 15 BBL System',
    description: '15-barrel brewhouse with fermenters, brite tanks, glycol chiller, and grain handling. Turnkey operation.',
    category: 'Food & Bev', condition: 'Good', location: 'Portland, OR',
    price: 175000, commission: 8, photos: ['https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=600&h=450&fit=crop'],
    status: 'open', claimed_by: null, claim_start: null, claim_end: null, views: 312, created_at: new Date(now - 4 * day).toISOString(),
  },
  {
    id: 'lst-10', seller_id: 'user-4', title: 'MacBook Pro M3 Max — Bulk Lot (10 units)',
    description: '10x MacBook Pro 16" M3 Max, 36GB RAM, 1TB SSD. Factory sealed. Corporate overstock.',
    category: 'Electronics', condition: 'New', location: 'Austin, TX',
    price: 35000, commission: 5, photos: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=450&fit=crop'],
    status: 'open', claimed_by: null, claim_start: null, claim_end: null, views: 1567, created_at: new Date(now - 6 * hour).toISOString(),
  },
];

export const DEMO_CLOSINGS = [
  {
    id: 'cls-1', listing_id: 'lst-8', seller_id: 'user-2', closer_id: 'user-1',
    buyer_name: 'Pacific Manufacturing Inc.', buyer_email: 'purchasing@pacmfg.com',
    agreed_price: 59000, commission_rate: 10, platform_fee_pct: 4,
    status: 'completed',
    stripe_payment_intent_id: 'pi_demo1', stripe_checkout_url: null,
    created_at: new Date(now - 20 * day).toISOString(), completed_at: new Date(now - 15 * day).toISOString(),
  },
  {
    id: 'cls-2', listing_id: 'lst-3', seller_id: 'user-2', closer_id: 'user-1',
    buyer_name: 'Coastal Logistics LLC', buyer_email: 'ops@coastallogistics.com',
    agreed_price: 1200000, commission_rate: 5, platform_fee_pct: 4,
    status: 'paid',
    stripe_payment_intent_id: 'pi_demo2', stripe_checkout_url: 'https://checkout.stripe.com/demo',
    created_at: new Date(now - 1 * day).toISOString(), completed_at: null,
  },
];

export const DEMO_CONVERSATIONS = [
  {
    id: 'conv-1', listing_id: 'lst-3', seller_id: 'user-2', closer_id: 'user-1',
    last_message_text: 'The buyer wants to schedule a walkthrough this Friday.', last_message_at: new Date(now - 2 * hour).toISOString(),
  },
  {
    id: 'conv-2', listing_id: 'lst-8', seller_id: 'user-2', closer_id: 'user-1',
    last_message_text: 'Payment confirmed. Thanks for the smooth deal!', last_message_at: new Date(now - 15 * day).toISOString(),
  },
];

export const DEMO_MESSAGES = [
  { id: 'msg-1', conversation_id: 'conv-1', sender_id: 'user-1', text: 'Hi Marcus, I have a buyer interested in the warehouse. What\'s the earliest they can see it?', read: true, created_at: new Date(now - 1 * day).toISOString() },
  { id: 'msg-2', conversation_id: 'conv-1', sender_id: 'user-2', text: 'Great to hear! They can come by any weekday. Just give me 24 hours notice.', read: true, created_at: new Date(now - 23 * hour).toISOString() },
  { id: 'msg-3', conversation_id: 'conv-1', sender_id: 'user-1', text: 'Perfect. I\'ll coordinate. They\'re very motivated — pre-approved financing.', read: true, created_at: new Date(now - 5 * hour).toISOString() },
  { id: 'msg-4', conversation_id: 'conv-1', sender_id: 'user-2', text: 'The buyer wants to schedule a walkthrough this Friday.', read: false, created_at: new Date(now - 2 * hour).toISOString() },
  { id: 'msg-5', conversation_id: 'conv-2', sender_id: 'user-1', text: 'The buyer confirmed they\'re happy with the machine. Releasing funds now.', read: true, created_at: new Date(now - 15 * day - 1 * hour).toISOString() },
  { id: 'msg-6', conversation_id: 'conv-2', sender_id: 'user-2', text: 'Payment confirmed. Thanks for the smooth deal!', read: true, created_at: new Date(now - 15 * day).toISOString() },
];

export const DEMO_REVIEWS = [
  { id: 'rev-1', listing_id: 'lst-8', seller_id: 'user-2', closer_id: 'user-1', stars: 5, text: 'Jordan handled this deal flawlessly. Found a qualified buyer within days and negotiated a fair price. Highly recommend.', created_at: new Date(now - 14 * day).toISOString() },
];

export const DEMO_WATCHLIST = [
  { id: 'wl-1', user_id: 'user-1', listing_id: 'lst-2', notify: true },
  { id: 'wl-2', user_id: 'user-1', listing_id: 'lst-5', notify: false },
  { id: 'wl-3', user_id: 'user-1', listing_id: 'lst-10', notify: false },
];

export const DEMO_NOTIFICATIONS = [
  { id: 'notif-1', user_id: 'user-1', type: 'closing', title: 'Payment Received', body: 'Coastal Logistics has completed payment for Downtown Warehouse.', data: { closing_id: 'cls-2' }, read: false, created_at: new Date(now - 1 * day).toISOString() },
  { id: 'notif-2', user_id: 'user-1', type: 'message', title: 'New Message', body: 'Marcus Rivera sent you a message about Downtown Warehouse.', data: { conversation_id: 'conv-1' }, read: false, created_at: new Date(now - 2 * hour).toISOString() },
  { id: 'notif-3', user_id: 'user-1', type: 'claim', title: 'Listing Claimed', body: 'Sarah Chen claimed 2022 Porsche 911 GT3.', data: { listing_id: 'lst-4' }, read: true, created_at: new Date(now - 5 * day).toISOString() },
  { id: 'notif-4', user_id: 'user-1', type: 'review', title: 'New Review', body: 'Marcus Rivera left you a 5-star review.', data: { review_id: 'rev-1' }, read: true, created_at: new Date(now - 14 * day).toISOString() },
  { id: 'notif-5', user_id: 'user-1', type: 'completed', title: 'Deal Completed', body: 'CNC Milling Machine deal is complete. $5,900 earned!', data: { closing_id: 'cls-1' }, read: true, created_at: new Date(now - 15 * day).toISOString() },
];

export const CATEGORIES = ['Real Estate', 'Industrial', 'Vehicles', 'Collectibles', 'Equipment', 'Fashion', 'Food & Bev', 'Electronics'];
export const CONDITIONS = ['New', 'Excellent', 'Good', 'Fair'];

export function getUserById(id) {
  return DEMO_USERS.find(u => u.id === id);
}

export function getListingById(id) {
  return DEMO_LISTINGS.find(l => l.id === id);
}

// Formats a dollar amount (not cents — name is historical) with two
// decimals and thousand separators. Always shows cents so split
// breakdowns don't round small commissions to a misleading "$0".
export function formatMoney(amount) {
  if (typeof amount !== 'number' || !isFinite(amount)) return '$0.00';
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getTimeRemaining(endIso) {
  const diff = new Date(endIso).getTime() - Date.now();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    expired: false,
    days: Math.floor(diff / day),
    hours: Math.floor((diff % day) / hour),
    minutes: Math.floor((diff % hour) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    total: diff,
  };
}

export function getCountdownColor(endIso) {
  const remaining = new Date(endIso).getTime() - Date.now();
  if (remaining > 72 * hour) return 'countdown-green';
  if (remaining > 24 * hour) return 'countdown-yellow';
  return 'countdown-red';
}
