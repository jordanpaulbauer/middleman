import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, DollarSign, TrendingUp, Zap, Heart, Bell, X, MessageCircle, Clock, Star } from 'lucide-react';
import { Listings, Watchlist, Closings, Auth, Chat, Reviews } from '../services';
import { getUserById, formatMoney, formatDate } from '../data/demo';
import CountdownTimer, { CountdownProgress } from '../components/CountdownTimer';
import Seo from '../components/Seo';
import AsyncButton from '../components/AsyncButton';

export default function CloserDashboard({ onOpenChat }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('claims');
  const [, setTick] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const user = Auth.getUser();

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

  const allListings = Listings.getAll();
  const activeClaims = allListings.filter(l => l.claimed_by === user?.id && (l.status === 'claimed' || l.status === 'negotiating'));
  const watchlistItems = Watchlist.get();
  const completedClosings = Closings.getAll().filter(c => c.closer_id === user?.id && c.status === 'completed');

  const totalEarned = completedClosings.reduce((sum, c) => sum + Math.round(c.agreed_price * c.commission_rate / 100), 0);
  const pipelineValue = activeClaims.reduce((sum, l) => sum + Math.round(l.price * l.commission / 100), 0);
  const totalAttempts = allListings.filter(l => l.claimed_by === user?.id).length;
  const closeRate = totalAttempts > 0 ? Math.round((completedClosings.length / totalAttempts) * 100) : 0;

  const handleStartClosing = (listing) => {
    navigate('/closings', { state: { startClosing: listing } });
  };

  const handleExtend = async (listingId) => {
    await Listings.extend(listingId);
    setTick(t => t + 1);
  };

  const handleMessage = async (listing) => {
    await Chat.startConversation(listing.id, listing.seller_id, user.id);
    onOpenChat?.();
  };

  return (
    <div className="page">
      <Seo title="Closer dashboard" noIndex />
      <div className="page-header">
        <div className="page-title">Closer Dashboard</div>
        <div className="page-subtitle">Your deals, pipeline, and earnings</div>
      </div>

      {/* Stats */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-label">Active Claims</div>
          <div className="stat-card-value">{activeClaims.length}</div>
          <div className="stat-card-sub">{formatMoney(pipelineValue)} pipeline</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Earned</div>
          <div className="stat-card-value" style={{ color: 'var(--green)' }}>{formatMoney(totalEarned)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Close Rate</div>
          <div className="stat-card-value">{closeRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">🔥 Streak</div>
          <div className="stat-card-value">{completedClosings.length}</div>
          <div className="stat-card-sub">consecutive</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'claims' ? 'active' : ''}`} onClick={() => setTab('claims')}>
          Active Claims ({activeClaims.length})
        </button>
        <button className={`tab ${tab === 'watchlist' ? 'active' : ''}`} onClick={() => setTab('watchlist')}>
          Watchlist ({watchlistItems.length})
        </button>
        <button className={`tab ${tab === 'earnings' ? 'active' : ''}`} onClick={() => setTab('earnings')}>
          Earnings
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeClaims.length === 0 ? (
            <div className="empty-state card"><Zap size={48} className="empty-state-icon" />
              <div className="empty-state-title">No active claims</div>
              <div className="empty-state-desc">Browse listings and claim one to get started.</div>
              <button className="btn btn-primary" onClick={() => navigate('/browse')}>Browse Listings</button>
            </div>
          ) : activeClaims.map(listing => {
            const seller = getUserById(listing.seller_id);
            const payout = Math.round(listing.price * listing.commission / 100);
            const canExtend = listing.status === 'claimed';
            return (
              <div key={listing.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <img src={listing.photos?.[0]} alt="" style={{ width: 100, height: 75, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 16 }}>{listing.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatMoney(payout)} commission · {listing.commission}%
                        </div>
                      </div>
                      <span className={`badge ${listing.status === 'negotiating' ? 'badge-blue' : 'badge-orange'}`}>
                        {listing.status === 'negotiating' ? 'In Negotiation' : 'Claimed'}
                      </span>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
                        <Clock size={14} color="var(--text-muted)" />
                        <CountdownTimer endDate={listing.claim_end} />
                      </div>
                      <CountdownProgress startDate={listing.claim_start} endDate={listing.claim_end} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                      {canExtend && (
                        <AsyncButton className="btn btn-secondary btn-sm" onClick={() => handleExtend(listing.id)}>
                          💬 Negotiate (+2d)
                        </AsyncButton>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={() => handleStartClosing(listing)}>
                        💰 Start Closing
                      </button>
                      <AsyncButton className="btn btn-ghost btn-sm" onClick={() => handleMessage(listing)}>
                        <MessageCircle size={14} /> Message Seller
                      </AsyncButton>
                      <AsyncButton
                        className="btn btn-ghost btn-sm"
                        title="Release this claim back to the marketplace"
                        style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
                        onClick={async () => {
                          if (!window.confirm(`Release claim on "${listing.title}"? Other closers will be able to claim it.`)) return;
                          try {
                            await Listings.withdraw(listing.id);
                            setTick(t => t + 1);
                          } catch (err) {
                            window.alert(err?.message || 'Could not withdraw claim');
                          }
                        }}
                      >
                        Release claim
                      </AsyncButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'watchlist' && (
        <div className="grid-3">
          {watchlistItems.length === 0 ? (
            <div className="empty-state card" style={{ gridColumn: '1/-1' }}>
              <Heart size={48} className="empty-state-icon" />
              <div className="empty-state-title">Watchlist is empty</div>
              <div className="empty-state-desc">Save listings you're interested in.</div>
              <button className="btn btn-primary" onClick={() => navigate('/browse')}>Browse Listings</button>
            </div>
          ) : watchlistItems.map(w => {
            const l = w.listing;
            if (!l) return null;
            const isAvailable = l.status === 'open';
            return (
              <div key={w.id} className="card" style={{ padding: 16, position: 'relative' }}>
                <button onClick={() => { Watchlist.remove(l.id); setTick(t => t + 1); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{l.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {formatMoney(l.price)} · {l.commission}%
                </div>
                <span className={`badge ${isAvailable ? 'badge-green' : l.status === 'sold' ? 'badge-grey' : 'badge-orange'}`}>
                  {isAvailable ? 'Available' : l.status === 'sold' ? 'Sold' : 'Claimed'}
                </span>
                <div style={{ marginTop: 12 }}>
                  {isAvailable ? (
                    <AsyncButton className="btn btn-primary btn-sm" style={{ width: '100%' }}
                      onClick={async () => { await Listings.claim(l.id); setTick(t => t + 1); }}>
                      <Zap size={14} /> Claim Now — {l.commission}%
                    </AsyncButton>
                  ) : l.status !== 'sold' && (
                    <AsyncButton className={`btn btn-sm ${w.notify ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}
                      onClick={async () => { await Watchlist.setNotify(l.id, !w.notify); setTick(t => t + 1); }}>
                      <Bell size={14} fill={w.notify ? 'currentColor' : 'none'} /> {w.notify ? 'Notifications On' : 'Notify Me'}
                    </AsyncButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'earnings' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Item</th><th>Sale Price</th><th>Commission</th><th>Payout</th><th>Date</th><th>Review</th></tr>
              </thead>
              <tbody>
                {completedClosings.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No earnings yet</td></tr>
                ) : completedClosings.map(c => {
                  const listing = Listings.getById(c.listing_id);
                  const payout = Math.round(c.agreed_price * c.commission_rate / 100);
                  const myReview = Reviews.getMyReviewForClosing(c.id);
                  const withinWindow = c.completed_at &&
                    Date.now() - new Date(c.completed_at).getTime() < Reviews.REVIEW_WINDOW_DAYS * 86400000;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{listing?.title || 'Unknown'}</td>
                      <td>{formatMoney(c.agreed_price)}</td>
                      <td>{c.commission_rate}%</td>
                      <td style={{ color: 'var(--green)', fontWeight: 500 }}>{formatMoney(payout)}</td>
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
              {completedClosings.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 500, borderTop: '2px solid var(--border)' }}>
                    <td colSpan={3}>Total</td>
                    <td style={{ color: 'var(--green)' }}>{formatMoney(totalEarned)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-backdrop" onClick={() => setShowReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Review Seller</div>
              <button className="modal-close" onClick={() => setShowReviewModal(null)}><span style={{ fontSize: 18 }}>×</span></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Your review stays private until the seller also reviews you, or
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
    </div>
  );
}
