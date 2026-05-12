import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, DollarSign, ShoppingBag, MessageCircle, Eye, Tag, Clock, Star, Edit3, Trash2 } from 'lucide-react';
import { Listings, Closings, Reviews, Auth, Chat, Profile } from '../services';
import { getUserById, formatMoney, formatDate, formatTimeAgo } from '../data/demo';
import CountdownTimer, { CountdownProgress } from '../components/CountdownTimer';
import Seo from '../components/Seo';
import EditListingModal from '../components/EditListingModal';
import AsyncButton from '../components/AsyncButton';
import { useToast } from '../hooks/useToast';

export default function SellerDashboard({ onOpenChat }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [tab, setTab] = useState('listings');
  const [showReviewModal, setShowReviewModal] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [, setTick] = useState(0);
  const user = Auth.getUser();

  const myListings = Listings.getAll().filter(l => l.seller_id === user?.id);
  const activeListings = myListings.filter(l => l.status !== 'sold' && l.status !== 'expired');
  const completedSales = Closings.getAll().filter(c => c.seller_id === user?.id && c.status === 'completed');
  const activeClosers = new Set(myListings.filter(l => l.claimed_by).map(l => l.claimed_by)).size;

  const totalRevenue = completedSales.reduce((sum, c) => {
    const platformFee = c.agreed_price * c.platform_fee_pct / 100;
    const commission = c.agreed_price * c.commission_rate / 100;
    return sum + c.agreed_price - platformFee - commission;
  }, 0);

  // Activity feed
  const activityFeed = myListings.flatMap(l => {
    const events = [];
    events.push({ type: 'created', icon: Tag, text: `${l.title} was listed`, listing: l, time: l.created_at });
    if (l.claimed_by) {
      const closer = getUserById(l.claimed_by);
      events.push({ type: 'claim', icon: Users, text: `${closer?.full_name} claimed ${l.title}`, listing: l, time: l.claim_start });
    }
    if (l.status === 'sold') {
      events.push({ type: 'sold', icon: DollarSign, text: `${l.title} was sold!`, listing: l, time: l.created_at });
    }
    return events;
  }).sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 20);

  const handleReview = async () => {
    if (!showReviewModal) return;
    try {
      await Reviews.submit({
        closingId: showReviewModal.id,
        stars: reviewStars,
        text: reviewText,
      });
      setShowReviewModal(null);
      setReviewText('');
      setReviewStars(5);
      setTick(t => t + 1);
    } catch (err) {
      window.alert(err?.message || 'Could not submit review');
    }
  };

  return (
    <div className="page">
      <Seo title="Seller dashboard" noIndex />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Seller Dashboard</div>
          <div className="page-subtitle">Manage your listings and revenue</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/post')}>
          <Plus size={16} /> Post Listing
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card"><div className="stat-card-label">Active Listings</div><div className="stat-card-value">{activeListings.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">Total Revenue</div><div className="stat-card-value" style={{ color: 'var(--green)' }}>{formatMoney(totalRevenue)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Active Closers</div><div className="stat-card-value">{activeClosers}</div></div>
        <div className="stat-card"><div className="stat-card-label">Completed Sales</div><div className="stat-card-value">{completedSales.length}</div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'listings' ? 'active' : ''}`} onClick={() => setTab('listings')}>Your Listings</button>
        <button className={`tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>Closer Activity</button>
        <button className={`tab ${tab === 'revenue' ? 'active' : ''}`} onClick={() => setTab('revenue')}>Revenue</button>
      </div>

      {tab === 'listings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {myListings.length === 0 ? (
            <div className="empty-state card"><ShoppingBag size={48} className="empty-state-icon" />
              <div className="empty-state-title">No listings yet</div>
              <div className="empty-state-desc">Post your first listing to get started.</div>
              <button className="btn btn-primary" onClick={() => navigate('/post')}>Post Listing</button>
            </div>
          ) : myListings.map(l => {
            const closer = l.claimed_by ? Profile.get(l.claimed_by) : null;
            const isClaimed = l.status === 'claimed' || l.status === 'negotiating';
            const commCost = l.price * l.commission / 100;
            return (
              <div key={l.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <img src={l.photos?.[0]} alt="" style={{ width: 100, height: 75, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontWeight: 500, fontSize: 16, minWidth: 0, flex: 1 }}>{l.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {l.status === 'open' && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Edit this listing"
                              onClick={() => setEditingListing(l)}
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                            <AsyncButton
                              className="btn btn-secondary btn-sm"
                              title="Delete this listing"
                              onClick={async () => {
                                if (!window.confirm(`Delete "${l.title}"? This can't be undone.`)) return;
                                try {
                                  await Listings.remove(l.id);
                                  addToast({ type: 'success', title: 'Listing deleted' });
                                  setTick(t => t + 1);
                                } catch (err) {
                                  addToast({ type: 'error', title: 'Could not delete', message: err?.message });
                                }
                              }}
                              style={{ color: 'var(--red)', borderColor: 'var(--red-light)' }}
                            >
                              <Trash2 size={14} /> Delete
                            </AsyncButton>
                          </>
                        )}
                        <span className={`badge ${l.status === 'open' ? 'badge-green' : l.status === 'sold' ? 'badge-grey' : 'badge-orange'}`}>
                          {l.status === 'open' ? 'Available' : l.status === 'sold' ? 'Sold' : 'Claimed'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatMoney(l.price)} · Commission cost: {formatMoney(commCost)}
                    </div>
                    {isClaimed && closer && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar avatar-sm">{closer.full_name?.[0]}</div>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{closer.full_name}</span>
                        <button className="btn btn-ghost btn-sm" onClick={async () => {
                          await Chat.startConversation(l.id, l.seller_id, l.claimed_by);
                          onOpenChat?.();
                        }}>
                          <MessageCircle size={14} /> Message
                        </button>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Clock size={14} color="var(--text-muted)" />
                          <CountdownTimer endDate={l.claim_end} compact />
                        </div>
                      </div>
                    )}
                    {isClaimed && <div style={{ marginTop: 8 }}><CountdownProgress startDate={l.claim_start} endDate={l.claim_end} /></div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'activity' && (
        <div className="card" style={{ padding: 0 }}>
          {activityFeed.length === 0 ? (
            <div className="empty-state"><Eye size={48} className="empty-state-icon" />
              <div className="empty-state-title">No activity yet</div></div>
          ) : activityFeed.map((event, i) => {
            const Icon = event.icon;
            return (
              <div key={i} style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, fontSize: 14 }}>{event.text}</div>
                {event.listing?.photos?.[0] && <img src={event.listing.photos[0]} alt="" style={{ width: 40, height: 30, borderRadius: 4, objectFit: 'cover' }} />}
                <div style={{ fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{formatTimeAgo(event.time)}</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'revenue' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Listing</th><th>Sale Price</th><th>Commission Paid</th><th>Platform Fee</th><th>Net Revenue</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {completedSales.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No sales yet</td></tr>
                ) : completedSales.map(c => {
                  const listing = Listings.getById(c.listing_id);
                  const commission = c.agreed_price * c.commission_rate / 100;
                  const platformFee = c.agreed_price * c.platform_fee_pct / 100;
                  const net = c.agreed_price - commission - platformFee;
                  const myReview = Reviews.getMyReviewForClosing(c.id);
                  const withinWindow = c.completed_at &&
                    Date.now() - new Date(c.completed_at).getTime() < Reviews.REVIEW_WINDOW_DAYS * 86400000;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{listing?.title || 'Unknown'}</td>
                      <td>{formatMoney(c.agreed_price)}</td>
                      <td style={{ color: 'var(--red)' }}>-{formatMoney(commission)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>-{formatMoney(platformFee)}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 500 }}>{formatMoney(net)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{formatDate(c.completed_at)}</td>
                      <td>
                        {myReview ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {myReview.published_at ? '✓ Reviewed' : 'Review pending'}
                          </span>
                        ) : withinWindow ? (
                          <button className="btn btn-secondary btn-sm" onClick={() => setShowReviewModal(c)}>
                            <Star size={14} /> Review
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-light)' }}>Window closed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-backdrop" onClick={() => setShowReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Review Closer</div>
              <button className="modal-close" onClick={() => setShowReviewModal(null)}><span style={{ fontSize: 18 }}>×</span></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Your review stays private until the closer also reviews you, or
                until 21 days pass — whichever comes first. Neither side can read
                the other's review during that window.
              </p>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setReviewStars(s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 28, color: s <= reviewStars ? 'var(--yellow)' : 'var(--border)' }}>
                    ★
                  </button>
                ))}
              </div>
              <textarea className="textarea" placeholder="Write your review..." value={reviewText} onChange={e => setReviewText(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReviewModal(null)}>Cancel</button>
              <AsyncButton className="btn btn-primary" onClick={handleReview} disabled={!reviewText.trim()}>Submit Review</AsyncButton>
            </div>
          </div>
        </div>
      )}

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => {
            addToast({ type: 'success', title: 'Listing updated' });
            setEditingListing(null);
            setTick(t => t + 1);
          }}
        />
      )}
    </div>
  );
}
