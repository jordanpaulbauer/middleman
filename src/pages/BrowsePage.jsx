import React, { useState, useMemo } from 'react';
import { Search, X, Heart, Flame, Eye, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Listings, Watchlist } from '../services';
import { getUserById, formatMoney, CATEGORIES } from '../data/demo';
import CountdownTimer from '../components/CountdownTimer';
import ListingDetailModal from '../components/ListingDetailModal';
import Seo from '../components/Seo';

const SORTS = [
  { value: 'trending', label: '🔥 Trending' },
  { value: 'commission_desc', label: 'Commission % ↓' },
  { value: 'commission_asc', label: 'Commission % ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'expiring', label: 'Expiring Soonest' },
  { value: 'newest', label: 'Newest' },
];

export default function BrowsePage({ onOpenChat }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState('trending');
  const [selectedListing, setSelectedListing] = useState(null);
  const [, setTick] = useState(0);

  const allListings = Listings.getAll();

  const filtered = useMemo(() => {
    let items = [...allListings];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(l => {
        const seller = getUserById(l.seller_id);
        return l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q) || l.location?.toLowerCase().includes(q) ||
          seller?.full_name?.toLowerCase().includes(q);
      });
    }
    if (statusFilter === 'available') items = items.filter(l => l.status === 'open');
    else if (statusFilter === 'claimed') items = items.filter(l => l.status === 'claimed' || l.status === 'negotiating');
    if (categoryFilter !== 'all') items = items.filter(l => l.category === categoryFilter);
    switch (sort) {
      case 'trending': items.sort((a, b) => (b.views || 0) - (a.views || 0)); break;
      case 'commission_desc': items.sort((a, b) => b.commission - a.commission); break;
      case 'commission_asc': items.sort((a, b) => a.commission - b.commission); break;
      case 'price_desc': items.sort((a, b) => b.price - a.price); break;
      case 'price_asc': items.sort((a, b) => a.price - b.price); break;
      case 'expiring': items.sort((a, b) => {
        if (!a.claim_end) return 1; if (!b.claim_end) return -1;
        return new Date(a.claim_end) - new Date(b.claim_end);
      }); break;
      case 'newest': items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
    }
    return items;
  }, [allListings, search, statusFilter, categoryFilter, sort]);

  const handleCardClick = (listing) => {
    Listings.incrementViews(listing.id);
    setSelectedListing(listing);
  };

  const toggleWatchlist = (e, listingId) => {
    e.stopPropagation();
    if (Watchlist.isInWatchlist(listingId)) Watchlist.remove(listingId);
    else Watchlist.add(listingId);
    setTick(t => t + 1);
  };

  return (
    <div className="page">
      <Seo title="Browse listings" noIndex />
      {/* ── Category pill bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0 14px', borderBottom: '1px solid var(--border-light)', marginBottom: 20,
        overflowX: 'auto',
      }}>
        <div className="pill-group" style={{ flexWrap: 'nowrap', gap: 6 }}>
          <button className={`pill ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}>All</button>
          {CATEGORIES.map(c => (
            <button key={c} className={`pill ${categoryFilter === c ? 'active' : ''}`}
              onClick={() => setCategoryFilter(c)}>{c}</button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        {/* Status filters */}
        <div className="pill-group" style={{ flexWrap: 'nowrap', gap: 6 }}>
          {['all', 'available', 'claimed'].map(s => (
            <button key={s} className={`pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
              style={{ fontSize: 13 }}>
              {s === 'all' ? 'All Status' : s === 'available' ? 'Available' : 'Claimed'}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />

        {/* Sort */}
        <select className="select" style={{ width: 160, flexShrink: 0, borderRadius: 20, padding: '5px 32px 5px 12px', fontSize: 12, fontWeight: 500, height: 30 }}
          value={sort} onChange={e => setSort(e.target.value)}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* ── Search bar (Airbnb-style pill) ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          position: 'relative', maxWidth: 480,
        }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: 13, color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search listings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              paddingLeft: 42, paddingRight: search ? 40 : 16,
              borderRadius: 32, border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)', height: 44,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 12, top: 12, background: 'var(--bg-muted)', border: 'none',
                width: 20, height: 20, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontWeight: 500 }}>
        Showing {filtered.length} of {allListings.length} listings
      </div>

      {/* ── Grid (Airbnb photography-first cards) ── */}
      {filtered.length === 0 ? (
        <div className="empty-state card" style={{ padding: 80 }}>
          <Search size={48} className="empty-state-icon" />
          <div className="empty-state-title">No listings found</div>
          <div className="empty-state-desc">Try adjusting your filters or search terms.</div>
          <button className="btn btn-primary" onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {filtered.map(listing => (
            <ListingCard key={listing.id} listing={listing}
              onClick={() => handleCardClick(listing)}
              onToggleWatchlist={toggleWatchlist} />
          ))}
        </div>
      )}

      {selectedListing && (
        <ListingDetailModal
          listing={Listings.getById(selectedListing.id) || selectedListing}
          onClose={() => setSelectedListing(null)}
          onOpenChat={onOpenChat}
          onRefresh={() => setTick(t => t + 1)}
        />
      )}
    </div>
  );
}

function ListingCard({ listing, onClick, onToggleWatchlist }) {
  const seller = getUserById(listing.seller_id);
  const payout = Math.round(listing.price * listing.commission / 100);
  const isClaimed = listing.status === 'claimed' || listing.status === 'negotiating';
  const isSold = listing.status === 'sold';
  const inWatchlist = Watchlist.isInWatchlist(listing.id);

  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* ── Photo (Airbnb: generous height, rounded, heart overlay) ── */}
      <div style={{
        position: 'relative', paddingTop: '94%', borderRadius: 12,
        overflow: 'hidden', background: 'var(--bg-muted)', marginBottom: 10,
      }}>
        {listing.photos?.[0] && (
          <img src={listing.photos[0]} alt={listing.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {/* Heart (Airbnb: white icon, dark shadow stroke) */}
        <button onClick={(e) => onToggleWatchlist(e, listing.id)}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            filter: inWatchlist ? 'none' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))',
            transition: 'transform 200ms',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Heart size={24}
            fill={inWatchlist ? 'var(--rausch)' : 'rgba(0,0,0,0.5)'}
            color={inWatchlist ? 'var(--rausch)' : 'white'}
            strokeWidth={2} />
        </button>

        {/* Status badge (top left) */}
        {(isClaimed || isSold) && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            {isSold ? (
              <span style={{ background: 'var(--text)', color: 'white', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>SOLD</span>
            ) : (
              <span style={{ background: 'white', color: 'var(--text)', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>CLAIMED</span>
            )}
          </div>
        )}

        {/* Fire badge */}
        {payout > 5000 && !isClaimed && !isSold && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'white', padding: '4px 8px', borderRadius: 4,
            fontSize: 11, fontWeight: 700, color: 'var(--text)',
            boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Flame size={12} color="var(--rausch)" /> HIGH VALUE
          </div>
        )}
      </div>

      {/* ── Details (Airbnb: tight, warm) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.25, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.title}
          </div>
          {listing.status === 'open' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, fontSize: 14, fontWeight: 500 }}>
              <span style={{ color: 'var(--rausch)' }}>●</span> {listing.commission}%
            </div>
          )}
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2, fontWeight: 400 }}>
          {seller?.full_name} · {listing.location}
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>
          {listing.category} · {listing.condition}
        </div>

        <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{formatMoney(listing.price)}</span>
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
            {formatMoney(payout)} payout
          </span>
        </div>

        {/* Countdown for claimed */}
        {isClaimed && listing.claim_end && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Clock size={13} color="var(--text-muted)" />
            <CountdownTimer endDate={listing.claim_end} compact />
          </div>
        )}
      </div>
    </div>
  );
}
