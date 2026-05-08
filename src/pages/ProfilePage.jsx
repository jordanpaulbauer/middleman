import React, { useState, useRef } from 'react';
import { MapPin, Calendar, Star, Shield, Camera, Edit3, Eye, Check, X, Settings, ExternalLink } from 'lucide-react';
import { Auth, Profile, Reviews, Closings, Listings, Stripe } from '../services';
import { formatMoney, formatDate, CATEGORIES } from '../data/demo';
import { useToast } from '../hooks/useToast';
import Seo from '../components/Seo';

const BADGES = [
  { key: 'verified', icon: '🛡️', label: 'Verified' },
  { key: 'top_closer', icon: '🏆', label: 'Top Closer' },
  { key: 'fast_responder', icon: '⚡', label: 'Fast Responder' },
  { key: 'streak_5', icon: '🔥', label: '5+ Streak' },
  { key: 'high_value', icon: '💎', label: 'High-Value Deals' },
];

export default function ProfilePage() {
  const { addToast } = useToast();
  const [tab, setTab] = useState('closings');
  const [publicPreview, setPublicPreview] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [, setTick] = useState(0);
  const fileRef = useRef();
  const user = Auth.getUser();

  const reviews = Reviews.getForCloser(user?.id);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1) : '—';
  const allClosings = Closings.getAll().filter(c => c.closer_id === user?.id || c.seller_id === user?.id);
  const completedClosings = allClosings.filter(c => c.status === 'completed');
  const totalEarned = completedClosings.reduce((s, c) => s + Math.round(c.agreed_price * c.commission_rate / 100), 0);
  const closeRate = allClosings.length > 0 ? Math.round((completedClosings.length / allClosings.length) * 100) : 0;

  // Completeness
  const criteria = [
    { label: 'Bio Added', done: !!user?.bio },
    { label: 'Account Verified', done: true },
    { label: '1 Closing', done: completedClosings.length >= 1 },
    { label: '5+ Closings', done: completedClosings.length >= 5 },
    { label: 'Reviews Received', done: reviews.length > 0 },
    { label: 'Profile Photo', done: !!user?.photo_url },
    { label: 'Payout Connected', done: user?.stripe_payouts_enabled },
  ];
  const completePct = Math.round((criteria.filter(c => c.done).length / criteria.length) * 100);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await Profile.uploadPhoto(file);
    addToast({ type: 'success', title: 'Photo Updated' });
    setTick(t => t + 1);
  };

  const saveBio = async () => {
    await Profile.update({ bio });
    setEditingBio(false);
    addToast({ type: 'success', title: 'Bio Saved' });
    setTick(t => t + 1);
  };

  // Category breakdown for specialties
  const specialties = CATEGORIES.map(cat => {
    const catClosings = completedClosings.filter(c => {
      const l = Listings.getById(c.listing_id);
      return l?.category === cat;
    });
    const earned = catClosings.reduce((s, c) => s + Math.round(c.agreed_price * c.commission_rate / 100), 0);
    return { category: cat, count: catClosings.length, earned };
  }).filter(s => s.count > 0);

  return (
    <div className="page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Seo title="Profile" noIndex />
      {/* Header */}
      <div className="card" style={{ padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div className="avatar avatar-xl">
              {user?.photo_url ? <img src={user.photo_url} alt="" /> : user?.full_name?.[0]}
            </div>
            {!publicPreview && (
              <button onClick={() => fileRef.current?.click()}
                style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: 'white', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={14} />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>{user?.full_name}</h1>
              <span className="badge badge-blue">{user?.role}</span>
              <Shield size={16} color="var(--blue)" />
              <div className="pulse-dot" />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              {user?.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {user.location}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> Joined {formatDate(user?.joined_at)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={13} fill="var(--yellow)" color="var(--yellow)" /> {avgRating}</span>
            </div>

            {/* Bio */}
            {editingBio && !publicPreview ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <textarea className="textarea" value={bio} onChange={e => setBio(e.target.value.slice(0, 280))}
                  style={{ minHeight: 60, flex: 1 }} placeholder="Write your bio..." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveBio}><Check size={14} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingBio(false)}><X size={14} /></button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{user?.bio || 'No bio yet.'}</p>
                {!publicPreview && (
                  <button className="btn-ghost" style={{ padding: 4, flexShrink: 0 }}
                    onClick={() => { setBio(user?.bio || ''); setEditingBio(true); }}>
                    <Edit3 size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className={`btn btn-sm ${publicPreview ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPublicPreview(!publicPreview)}>
                <Eye size={14} /> {publicPreview ? 'Exit Preview' : 'Public Preview'}
              </button>
              {!publicPreview && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowSettings(true)}>
                  <Settings size={14} /> Settings
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Completeness Bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Profile Completeness</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{completePct}%</span>
          </div>
          <div className="progress-bar" style={{ height: 8, marginBottom: 12 }}>
            <div className="progress-fill" style={{ width: `${completePct}%`, background: 'var(--accent)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {criteria.map(c => (
              <span key={c.label} className={`badge ${c.done ? 'badge-green' : 'badge-grey'}`}>
                {c.done ? '✓' : '○'} {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          {BADGES.slice(0, showBadges ? BADGES.length : 3).map(b => (
            <span key={b.key} title={b.label} style={{ fontSize: 24, cursor: 'default' }}>{b.icon}</span>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBadges(!showBadges)}>
            {showBadges ? 'Collapse' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card"><div className="stat-card-label">Closings</div><div className="stat-card-value">{completedClosings.length}</div></div>
        <div className="stat-card"><div className="stat-card-label">Total Earned</div><div className="stat-card-value" style={{ color: 'var(--green)' }}>{formatMoney(totalEarned)}</div></div>
        <div className="stat-card"><div className="stat-card-label">Close Rate</div><div className="stat-card-value">{closeRate}%</div></div>
        <div className="stat-card"><div className="stat-card-label">Avg Response</div><div className="stat-card-value">2h</div></div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'closings' ? 'active' : ''}`} onClick={() => setTab('closings')}>Closings</button>
        <button className={`tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>Reviews ({reviews.length})</button>
        <button className={`tab ${tab === 'specialties' ? 'active' : ''}`} onClick={() => setTab('specialties')}>Specialties</button>
      </div>

      {tab === 'closings' && (
        <div className="card"><div className="table-container"><table>
          <thead><tr><th>Listing</th><th>Role</th><th>Sale Price</th><th>Commission</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {allClosings.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No closings yet</td></tr>
            ) : allClosings.map(c => {
              const listing = Listings.getById(c.listing_id);
              const role = c.closer_id === user?.id ? 'Closer' : 'Seller';
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{listing?.title || 'Unknown'}</td>
                  <td><span className={`badge ${role === 'Closer' ? 'badge-orange' : 'badge-blue'}`}>{role}</span></td>
                  <td>{formatMoney(c.agreed_price)}</td>
                  <td>{c.commission_rate}%</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(c.completed_at || c.created_at)}</td>
                  <td><span className={`badge ${c.status === 'completed' ? 'badge-green' : 'badge-orange'}`}>{c.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div></div>
      )}

      {tab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.length === 0 ? (
            <div className="empty-state card"><Star size={48} className="empty-state-icon" />
              <div className="empty-state-title">No reviews yet</div>
              <div className="empty-state-desc">Complete deals to receive reviews.</div></div>
          ) : reviews.map(r => (
            <div key={r.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16} fill={s <= r.stars ? 'var(--yellow)' : 'none'} color={s <= r.stars ? 'var(--yellow)' : 'var(--border)'} />
                ))}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{formatDate(r.created_at)}</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'specialties' && (
        <div className="card"><div className="table-container"><table>
          <thead><tr><th>Category</th><th>Deals Closed</th><th>Earnings</th></tr></thead>
          <tbody>
            {specialties.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No specialties yet</td></tr>
            ) : specialties.map(s => (
              <tr key={s.category}><td style={{ fontWeight: 500 }}>{s.category}</td><td>{s.count}</td>
                <td style={{ color: 'var(--green)', fontWeight: 600 }}>{formatMoney(s.earned)}</td></tr>
            ))}
          </tbody>
        </table></div></div>
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsModal user={user} onClose={() => setShowSettings(false)} onSave={() => setTick(t => t + 1)} />}
    </div>
  );
}

function SettingsModal({ user, onClose, onSave }) {
  const { addToast } = useToast();
  const [name, setName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');

  const handleSave = async () => {
    await Profile.update({ full_name: name, email, phone, location });
    addToast({ type: 'success', title: 'Settings Saved' });
    onSave();
    onClose();
  };

  const stripeStatus = Stripe.getAccountStatus();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Settings</div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Section title="Basic Info" status={name && email ? 'complete' : 'pending'}>
              <div className="input-group"><label className="input-label">Full Name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group"><label className="input-label">Phone</label>
                  <input className="input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                <div className="input-group"><label className="input-label">Location</label>
                  <input className="input" value={location} onChange={e => setLocation(e.target.value)} /></div>
              </div>
            </Section>

            <Section title="Stripe Payout" status={stripeStatus.enabled ? 'complete' : (stripeStatus.connected ? 'pending' : 'pending')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {stripeStatus.enabled
                      ? 'Payouts enabled'
                      : stripeStatus.connected
                        ? 'Onboarding incomplete'
                        : 'Connect Stripe to receive payouts'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {stripeStatus.enabled
                      ? 'Your account is ready to receive funds.'
                      : stripeStatus.connected
                        ? 'Finish onboarding to start receiving payouts.'
                        : 'Required before any deal can pay out commission.'}
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      const data = await Stripe.getConnectOnboardingLink({});
                      if (data?.url) window.location.assign(data.url);
                    } catch (e) {
                      addToast({ type: 'error', title: 'Stripe', message: e.message || 'Could not start onboarding' });
                    }
                  }}
                >
                  <ExternalLink size={14} /> {stripeStatus.connected ? 'Continue onboarding' : 'Connect Stripe'}
                </button>
              </div>
            </Section>

            <Section title="Notifications" status="complete">
              <ToggleRow label="Email notifications" defaultOn />
              <ToggleRow label="Push notifications" defaultOn />
              <ToggleRow label="Marketing emails" defaultOn={false} />
            </Section>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, status, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'complete' ? 'var(--green)' : 'var(--border)' }} />
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 16 }}>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ label, defaultOn = true }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <button onClick={() => setOn(!on)}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
          background: on ? 'var(--accent)' : 'var(--border)', transition: 'background 200ms' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3,
          left: on ? 23 : 3, transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </button>
    </div>
  );
}
