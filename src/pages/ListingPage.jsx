import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Tag, Eye, ArrowLeft, Heart, Flag } from 'lucide-react';
import { Listings, Watchlist, Auth, Profile } from '../services';
import { formatMoney } from '../data/demo';
import CountdownTimer from '../components/CountdownTimer';
import Seo from '../components/Seo';
import ReportModal from '../components/ReportModal';
import NotFoundPage from './NotFoundPage';

const STATUS_STYLES = {
  open: { label: 'Available', color: 'var(--green)', bg: 'var(--green-light)' },
  claimed: { label: 'Claimed', color: 'var(--yellow)', bg: 'var(--yellow-light)' },
  negotiating: { label: 'Negotiating', color: 'var(--blue)', bg: 'var(--blue-light)' },
  sold: { label: 'Sold', color: 'var(--text-muted)', bg: 'var(--bg-muted)' },
  expired: { label: 'Expired', color: 'var(--text-muted)', bg: 'var(--bg-muted)' },
};

export default function ListingPage({ onRequireAuth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const [reporting, setReporting] = useState(false);
  const user = Auth.getUser();

  const listing = Listings.getById(id);
  if (!listing) return <NotFoundPage />;

  const seller = Profile.get(listing.seller_id);
  const payout = (listing.price || 0) * (listing.commission || 0) / 100;
  const photo = listing.photos?.[0];
  const status = STATUS_STYLES[listing.status] || STATUS_STYLES.open;
  const isWatched = user ? Watchlist.isInWatchlist(listing.id) : false;

  const handleClaim = () => {
    if (!user) { onRequireAuth?.(); return; }
    Listings.claim(listing.id);
    setTick(t => t + 1);
  };
  const handleWatch = () => {
    if (!user) { onRequireAuth?.(); return; }
    if (isWatched) Watchlist.remove(listing.id); else Watchlist.add(listing.id);
    setTick(t => t + 1);
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 24px 64px' }}>
      <Seo
        title={listing.title}
        description={listing.description?.slice(0, 160) || `${formatMoney(listing.price)} · ${listing.commission}% commission`}
        image={photo}
      />

      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 14, color: 'var(--text-muted)', padding: '8px 0',
          marginBottom: 12,
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32,
        alignItems: 'start',
      }}>
        {/* ── Photos + description ── */}
        <div>
          <div style={{
            position: 'relative', borderRadius: 20, overflow: 'hidden',
            background: 'var(--bg-muted)', aspectRatio: '4/3',
          }}>
            {photo ? (
              <img
                src={photo}
                alt={listing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-light)', fontSize: 14,
              }}>No photo</div>
            )}
            <span style={{
              position: 'absolute', top: 16, left: 16,
              padding: '6px 12px', background: status.bg, color: status.color,
              borderRadius: 999, fontSize: 12, fontWeight: 500, 
              
            }}>{status.label}</span>
          </div>

          {/* Description */}
          {listing.description && (
            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 10px' }}>About this listing</h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                {listing.description}
              </p>
            </div>
          )}

          {/* Meta strip */}
          <div style={{
            marginTop: 24, padding: '20px 0', borderTop: '1px solid var(--border-light)',
            display: 'flex', flexWrap: 'wrap', gap: 18,
            fontSize: 14, color: 'var(--text-muted)',
          }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Tag size={15} /> {listing.category}</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{listing.condition}</span>
            {listing.location && <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={15} /> {listing.location}</span>}
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Eye size={15} /> {listing.views || 0} views</span>
            <button
              onClick={() => user ? setReporting(true) : onRequireAuth?.()}
              style={{
                display: 'flex', gap: 6, alignItems: 'center',
                background: 'transparent', border: 'none', padding: 0,
                cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)',
              }}
              title="Report this listing"
            >
              <Flag size={14} /> Report
            </button>
          </div>
        </div>

        {/* ── Sticky right rail: price, claim CTA, seller ── */}
        <aside style={{ position: 'sticky', top: 88 }}>
          <div style={{
            border: '1px solid var(--border-light)', borderRadius: 18,
            padding: 24, boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, 
              color: 'var(--text-muted)', marginBottom: 6 }}>
              {listing.commission}% commission
            </div>
            <div style={{
              display: 'inline-block', padding: '8px 14px',
              background: 'var(--green-light)', color: 'var(--green)',
              borderRadius: 999, fontSize: 18, fontWeight: 500,
              marginBottom: 12,
            }}>
              {formatMoney(payout)} payout
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 500, margin: '0 0 6px',
              letterSpacing: '-0.4px', lineHeight: 1.2,
            }}>{listing.title}</h1>
            <div style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 16 }}>
              {formatMoney(listing.price)} asking
            </div>

            {listing.claim_end && listing.status !== 'sold' && listing.status !== 'expired' && (
              <div style={{
                marginBottom: 16, padding: '10px 12px',
                background: 'var(--bg-subtle)', borderRadius: 10,
                fontSize: 13, color: 'var(--text)',
              }}>
                <CountdownTimer target={listing.claim_end} />
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listing.status === 'open' ? (
                <button
                  onClick={handleClaim}
                  style={{
                    padding: '14px 18px', background: 'var(--rausch)',
                    color: 'white', border: 'none', borderRadius: 10,
                    fontSize: 15, fontWeight: 500, cursor: 'pointer',
                  }}
                >{user ? 'Claim this listing' : 'Sign in to claim'}</button>
              ) : (
                <button
                  disabled
                  style={{
                    padding: '14px 18px', background: 'var(--bg-muted)',
                    color: 'var(--text-muted)', border: 'none', borderRadius: 10,
                    fontSize: 15, fontWeight: 500, cursor: 'not-allowed',
                  }}
                >{status.label}</button>
              )}
              <button
                onClick={handleWatch}
                style={{
                  padding: '12px 18px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 10,
                  fontSize: 14, fontWeight: 500, color: 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Heart size={16} fill={isWatched ? 'var(--rausch)' : 'none'} color={isWatched ? 'var(--rausch)' : 'currentColor'} />
                {isWatched ? 'Watching' : 'Watch'}
              </button>
            </div>
          </div>

          {/* Seller card */}
          {seller && (
            <Link
              to={`/u/${seller.id}`}
              style={{
                display: 'flex', gap: 14, alignItems: 'center',
                marginTop: 16, padding: 16,
                border: '1px solid var(--border-light)', borderRadius: 14,
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--text)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 500,
              }}>{seller.full_name?.[0]?.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Listed by</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{seller.full_name}</div>
                {seller.location && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{seller.location}</div>
                )}
              </div>
            </Link>
          )}
        </aside>
      </div>

      {reporting && (
        <ReportModal
          entityType="listing"
          entityId={listing.id}
          entityLabel={listing.title}
          onClose={() => setReporting(false)}
          onSubmitted={() => {
            setReporting(false);
            // Use a tiny delay so toast renders after modal closes; toast hook
            // is local, fall back to alert here for the public listing page
            // since useToast isn't wired to this surface.
            window.alert('Report submitted. Our team will review.');
          }}
        />
      )}
    </div>
  );
}
