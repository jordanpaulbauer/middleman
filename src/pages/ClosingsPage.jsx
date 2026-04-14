import React, { useState } from 'react';
import { CreditCard, Lock, Handshake, DollarSign, Copy, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Closings, Listings, Auth } from '../services';
import { getUserById, formatMoney, formatDate } from '../data/demo';
import { useToast } from '../hooks/useToast';
import { useLocation } from 'react-router-dom';

const STEPS = [
  { key: 'pending_payment', icon: '💳', label: 'Initiate' },
  { key: 'paid', icon: '🔒', label: 'Escrow' },
  { key: 'item_confirmed', icon: '🤝', label: 'Handoff' },
  { key: 'completed', icon: '💰', label: 'Payout' },
];

function getStepIndex(status) {
  if (status === 'pending_payment') return 0;
  if (status === 'paid') return 1;
  if (status === 'item_confirmed') return 2;
  if (status === 'completed') return 3;
  return 0;
}

export default function ClosingsPage() {
  const { addToast } = useToast();
  const location = useLocation();
  const [tab, setTab] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [showStartModal, setShowStartModal] = useState(location.state?.startClosing || null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [, setTick] = useState(0);
  const user = Auth.getUser();

  const allClosings = Closings.getAll().filter(c => c.seller_id === user?.id || c.closer_id === user?.id);
  const activeClosings = allClosings.filter(c => c.status !== 'completed' && c.status !== 'disputed');
  const completedClosings = allClosings.filter(c => c.status === 'completed');

  const totalEscrow = activeClosings.reduce((s, c) => s + (c.status === 'paid' || c.status === 'item_confirmed' ? c.agreed_price : 0), 0);
  const totalEarned = completedClosings.reduce((s, c) => s + Math.round(c.agreed_price * c.commission_rate / 100), 0);

  const filtered = tab === 'active' ? activeClosings : tab === 'completed' ? completedClosings : allClosings;

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCreateClosing = async () => {
    if (!showStartModal || !buyerName || !buyerEmail || !agreedPrice) return;
    const closing = await Closings.create({
      listingId: showStartModal.id, buyerName, buyerEmail,
      agreedPrice: parseInt(agreedPrice),
    });
    addToast({ type: 'success', title: 'Closing Created', message: 'Payment link generated.' });
    setShowStartModal(null);
    setBuyerName(''); setBuyerEmail(''); setAgreedPrice('');
    setTick(t => t + 1);
  };

  const price = parseInt(agreedPrice) || 0;
  const previewListing = showStartModal;
  const previewCommRate = previewListing?.commission || 10;
  const previewComm = Math.round(price * previewCommRate / 100);
  const previewPlatform = Math.round(price * 4 / 100);
  const previewSeller = price - previewComm - previewPlatform;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Closings</div>
        <div className="page-subtitle">Track escrow, handoffs, and payouts</div>
      </div>

      <div className="stat-cards">
        <div className="stat-card"><div className="stat-card-label">Active Closings</div><div className="stat-card-value">{activeClosings.length}</div>
          <div className="stat-card-sub">{formatMoney(totalEscrow)} in escrow</div></div>
        <div className="stat-card"><div className="stat-card-label">Completed</div><div className="stat-card-value">{completedClosings.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">In Escrow</div><div className="stat-card-value" style={{ color: 'var(--blue)' }}>{formatMoney(totalEscrow)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Total Earned</div><div className="stat-card-value" style={{ color: 'var(--green)' }}>{formatMoney(totalEarned)}</div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All ({allClosings.length})</button>
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>Active ({activeClosings.length})</button>
        <button className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>Completed ({completedClosings.length})</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card"><Lock size={48} className="empty-state-icon" />
          <div className="empty-state-title">No closings yet</div>
          <div className="empty-state-desc">Start a closing from an active claim.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map(c => {
            const listing = Listings.getById(c.listing_id);
            const seller = getUserById(c.seller_id);
            const closer = getUserById(c.closer_id);
            const stepIdx = getStepIndex(c.status);
            const isExpanded = expanded[c.id];
            const commission = Math.round(c.agreed_price * c.commission_rate / 100);
            const platformFee = Math.round(c.agreed_price * c.platform_fee_pct / 100);
            const sellerNet = c.agreed_price - commission - platformFee;
            const isSeller = c.seller_id === user?.id;

            return (
              <div key={c.id} className="card">
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <img src={listing?.photos?.[0]} alt="" style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{listing?.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Closer: {closer?.full_name} · Seller: {seller?.full_name}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Buyer: {c.buyer_name} ({c.buyer_email})
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{formatMoney(c.agreed_price)}</div>
                    </div>
                    {c.status === 'disputed' && <span className="badge badge-red"><AlertTriangle size={12} /> Disputed</span>}
                  </div>

                  {/* Stepper */}
                  <div className="stepper" style={{ marginBottom: 16 }}>
                    {STEPS.map((step, i) => (
                      <div key={step.key} className={`step ${i < stepIdx ? 'completed' : i === stepIdx ? 'active' : ''}`}>
                        <div className="step-icon">{i < stepIdx ? <CheckCircle size={18} /> : step.icon}</div>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Expand toggle */}
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => toggleExpand(c.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-light)' }}>
                    {/* Payout Breakdown */}
                    <div style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: 16, marginTop: 16, marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>Payout Breakdown</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <span>Seller ({seller?.full_name})</span><span style={{ fontWeight: 600 }}>{formatMoney(sellerNet)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <span>Closer ({closer?.full_name})</span><span style={{ fontWeight: 600, color: 'var(--green)' }}>{formatMoney(commission)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <span>Platform Fee ({c.platform_fee_pct}%)</span><span style={{ color: 'var(--text-muted)' }}>{formatMoney(platformFee)}</span>
                        </div>
                        <div style={{ height: 1, background: 'var(--border)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                          <span>Total</span><span>{formatMoney(c.agreed_price)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {c.status === 'pending_payment' && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            navigator.clipboard.writeText(c.stripe_checkout_url || '');
                            addToast({ title: 'Link Copied', type: 'success' });
                          }}>
                            <Copy size={14} /> Copy Payment Link
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={async () => {
                            await Closings.simulatePayment(c.id);
                            addToast({ type: 'success', title: 'Payment Simulated', message: 'Funds are now in escrow.' });
                            setTick(t => t + 1);
                          }}>
                            💳 Simulate Payment
                          </button>
                        </>
                      )}
                      {c.status === 'paid' && isSeller && (
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                          await Closings.confirmHandoff(c.id);
                          addToast({ type: 'success', title: 'Handoff Confirmed' });
                          setTick(t => t + 1);
                        }}>
                          <Handshake size={14} /> Confirm Item Handed Off
                        </button>
                      )}
                      {c.status === 'item_confirmed' && (
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                          await Closings.complete(c.id);
                          addToast({ type: 'success', title: 'Deal Complete!', message: 'Funds released to all parties.' });
                          setTick(t => t + 1);
                        }}>
                          <DollarSign size={14} /> Release Funds & Complete
                        </button>
                      )}
                      {c.status === 'completed' && (
                        <span className="badge badge-green"><CheckCircle size={12} /> Completed {formatDate(c.completed_at)}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Start Closing Modal */}
      {showStartModal && (
        <div className="modal-backdrop" onClick={() => setShowStartModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Start Closing</div>
              <button className="modal-close" onClick={() => setShowStartModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: 12, background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <img src={previewListing?.photos?.[0]} alt="" style={{ width: 60, height: 45, borderRadius: 6, objectFit: 'cover' }} />
                <div><div style={{ fontWeight: 600 }}>{previewListing?.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Asking: {formatMoney(previewListing?.price)} · {previewListing?.commission}% commission</div></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="input-group"><label className="input-label">Buyer Name</label>
                  <input className="input" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="John Smith" /></div>
                <div className="input-group"><label className="input-label">Buyer Email</label>
                  <input className="input" type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="buyer@email.com" /></div>
                <div className="input-group"><label className="input-label">Agreed Price ($)</label>
                  <input className="input" type="number" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)} placeholder={previewListing?.price?.toString()} /></div>
              </div>
              {price > 0 && (
                <div style={{ marginTop: 20, background: 'var(--bg-subtle)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Live Payout Preview</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span>Seller</span><span>{formatMoney(previewSeller)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span>Closer (you)</span><span style={{ color: 'var(--green)', fontWeight: 600 }}>{formatMoney(previewComm)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-muted)' }}>
                    <span>Platform (4%)</span><span>{formatMoney(previewPlatform)}</span></div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStartModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateClosing}
                disabled={!buyerName || !buyerEmail || !agreedPrice}>
                Generate Payment Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
