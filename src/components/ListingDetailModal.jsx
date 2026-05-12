import React, { useState } from 'react';
import { X, Heart, Bell, MapPin, Tag, Zap, MessageCircle, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { Listings, Watchlist, Chat, Auth, Admin } from '../services';
import { getUserById, formatMoney, getCountdownColor } from '../data/demo';
import CountdownTimer from './CountdownTimer';
import AdminRemoveListingModal from './AdminRemoveListingModal';
import { useToast } from '../hooks/useToast';

export default function ListingDetailModal({ listing, onClose, onOpenChat, onRefresh }) {
  const { addToast } = useToast();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showAdminRemove, setShowAdminRemove] = useState(false);
  const [, setTick] = useState(0);
  const user = Auth.getUser();
  const isAdmin = Admin.isAdmin();

  const seller = getUserById(listing.seller_id);
  const claimer = listing.claimed_by ? getUserById(listing.claimed_by) : null;
  const payout = Math.round(listing.price * listing.commission / 100);
  const isAvailable = listing.status === 'open';
  const isClaimed = listing.status === 'claimed' || listing.status === 'negotiating';
  const isSold = listing.status === 'sold';
  const inWatchlist = Watchlist.isInWatchlist(listing.id);
  const notifyEnabled = Watchlist.getNotify(listing.id);
  const isMyListing = listing.seller_id === user?.id;
  const isMyClaim = listing.claimed_by === user?.id;

  const handleClaim = async () => {
    await Listings.claim(listing.id);
    addToast({ type: 'success', title: 'Listing Claimed!', message: `You have 7 days to close this deal.` });
    onRefresh?.();
  };

  const toggleWatchlist = () => {
    if (inWatchlist) Watchlist.remove(listing.id);
    else Watchlist.add(listing.id);
    setTick(t => t + 1);
  };

  const toggleNotify = () => {
    Watchlist.setNotify(listing.id, !notifyEnabled);
    setTick(t => t + 1);
  };

  const handleMessage = async () => {
    const sellerId = listing.seller_id;
    const closerId = listing.claimed_by || user?.id;
    await Chat.startConversation(listing.id, sellerId, closerId);
    onClose();
    onOpenChat?.();
  };

  const photos = listing.photos || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">{listing.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAdmin && (
              <button
                onClick={() => setShowAdminRemove(true)}
                title="Remove listing (admin)"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'transparent', color: 'var(--rausch)',
                  border: '1px solid var(--rausch)', borderRadius: 999,
                  padding: '4px 12px', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <ShieldAlert size={14} /> Remove
              </button>
            )}
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-body">
          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
              <img src={photos[photoIdx]} alt={listing.title}
                style={{ width: '100%', height: 400, objectFit: 'cover', background: 'var(--bg-muted)' }} />
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={20} />
                  </button>
                  <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                    {photos.map((_, i) => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === photoIdx ? 'white' : 'rgba(255,255,255,.5)', cursor: 'pointer' }}
                        onClick={() => setPhotoIdx(i)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sold banner */}
          {isSold && (
            <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '14px 20px', marginBottom: 20, textAlign: 'center', fontWeight: 500, color: 'var(--text-muted)' }}>
              This listing has been sold
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>Category</div>
              <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={14} color="var(--accent)" /> {listing.category}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>Condition</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{listing.condition}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>Location</div>
              <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color="var(--text-muted)" /> {listing.location}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>Seller</div>
              <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar avatar-sm">{seller?.full_name?.[0]}</div>
                {seller?.full_name}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>Description</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{listing.description}</p>
          </div>

          {/* Price & Commission */}
          <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24, border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Asking Price</div>
                <div style={{ fontSize: 28, fontWeight: 500 }}>{formatMoney(listing.price)}</div>
              </div>
              {payout > 5000 && <div className="fire-badge" style={{ fontSize: 13 }}>🔥 HOT DEAL</div>}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Commission</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--accent)' }}>{listing.commission}%</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Payout</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--green)' }}>{formatMoney(payout)}</div>
              </div>
            </div>
          </div>

          {/* Claim state */}
          {isClaimed && (
            <div style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24, border: '1px solid #fed7aa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 500 }}>Claimed by {claimer?.full_name || 'Unknown'}</div>
                <CountdownTimer endDate={listing.claim_end} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={handleMessage}>
                  <MessageCircle size={14} /> Message {isMyListing ? 'Closer' : 'Seller'}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isAvailable && !isMyListing && (
              <button className="btn btn-primary btn-lg" onClick={handleClaim} style={{ flex: 1 }}>
                <Zap size={18} /> Claim This Listing
              </button>
            )}
            {isAvailable && isMyListing && (
              <div style={{ flex: 1, textAlign: 'center', padding: 14, color: 'var(--text-muted)', fontSize: 14 }}>
                This is your listing
              </div>
            )}
            {isClaimed && !isMyClaim && !isMyListing && (
              <button className="btn btn-secondary btn-lg" disabled style={{ flex: 1 }}>
                Currently Claimed
              </button>
            )}

            <button className={`btn ${inWatchlist ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleWatchlist}>
              <Heart size={16} fill={inWatchlist ? 'currentColor' : 'none'} />
              {inWatchlist ? 'Saved' : 'Save'}
            </button>

            {isClaimed && inWatchlist && !isMyClaim && (
              <button className={`btn ${notifyEnabled ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleNotify}>
                <Bell size={16} fill={notifyEnabled ? 'currentColor' : 'none'} />
                {notifyEnabled ? 'Notifications On' : 'Notify Me'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showAdminRemove && (
        <AdminRemoveListingModal
          listing={listing}
          onClose={() => setShowAdminRemove(false)}
          onRemoved={() => { setShowAdminRemove(false); onClose?.(); onRefresh?.(); }}
        />
      )}
    </div>
  );
}
