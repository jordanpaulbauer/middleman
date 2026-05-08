import React from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Calendar, Star, Shield } from 'lucide-react';
import { Reviews, Closings, Listings } from '../services';
import { getUserById, formatMoney, formatDate } from '../data/demo';
import Seo from '../components/Seo';
import NotFoundPage from './NotFoundPage';

export default function PublicProfilePage() {
  const { userId } = useParams();
  const profile = getUserById(userId);
  if (!profile) return <NotFoundPage />;

  const reviews = Reviews.getForCloser(profile.id);
  const completedAsCloser = Closings.getAll().filter(
    (c) => c.closer_id === profile.id && c.status === 'completed'
  );
  const totalEarned = completedAsCloser.reduce(
    (sum, c) => sum + Math.round((c.agreed_price || 0) * (c.commission_rate || 0) / 100),
    0
  );
  const sellerListings = Listings.getAll().filter((l) => l.seller_id === profile.id);
  const avgStars =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 24px 64px' }}>
      <Seo
        title={profile.full_name}
        description={
          profile.bio ||
          `${profile.full_name} on MIDDLEMAN — ${completedAsCloser.length} completed deals, ${reviews.length} reviews.`
        }
        image={profile.photo_url}
      />

      {/* Header card */}
      <div style={{
        display: 'flex', gap: 24, alignItems: 'center',
        padding: '32px 0', borderBottom: '1px solid var(--border-light)',
        marginBottom: 28, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative' }}>
          {profile.photo_url ? (
            <img src={profile.photo_url} alt="" style={{
              width: 96, height: 96, borderRadius: '50%', objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: 'var(--text)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 600,
            }}>{profile.full_name?.[0]?.toUpperCase()}</div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: 28, fontWeight: 700, margin: 0,
              letterSpacing: '-0.4px',
            }}>{profile.full_name}</h1>
            {profile.is_verified && (
              <span title="Verified" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--blue-light)', color: 'var(--blue)',
                padding: '4px 10px', borderRadius: 999,
                fontSize: 12, fontWeight: 700,
              }}>
                <Shield size={13} /> Verified
              </span>
            )}
          </div>
          <div style={{
            marginTop: 6, fontSize: 14, color: 'var(--text-muted)',
            display: 'flex', gap: 14, flexWrap: 'wrap',
          }}>
            {profile.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} /> {profile.location}
              </span>
            )}
            {profile.joined_at && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={14} /> Joined {formatDate(profile.joined_at)}
              </span>
            )}
          </div>
          {profile.bio && (
            <p style={{
              marginTop: 12, fontSize: 15, color: 'var(--text)',
              lineHeight: 1.55,
            }}>{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        marginBottom: 32,
      }}>
        <Stat label="Closings" value={completedAsCloser.length} />
        <Stat label="Reviews" value={reviews.length} />
        <Stat label="Avg rating" value={avgStars ? `${avgStars} ★` : '—'} />
        <Stat label="Listed" value={sellerListings.length} />
      </div>

      {/* Specialties */}
      {profile.specialties?.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Specialties</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.specialties.map((s) => (
              <span key={s} style={{
                padding: '6px 12px', background: 'var(--bg-subtle)',
                borderRadius: 999, fontSize: 13, fontWeight: 500,
              }}>{s}</span>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
          Reviews {reviews.length > 0 && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>· {reviews.length}</span>
          )}
        </h2>
        {reviews.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No reviews yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reviews.map((r) => {
              const seller = getUserById(r.seller_id);
              return (
                <div key={r.id} style={{
                  border: '1px solid var(--border-light)', borderRadius: 14,
                  padding: 18,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--text)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600,
                    }}>{seller?.full_name?.[0]?.toUpperCase() || '?'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{seller?.full_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 2, color: 'var(--rausch)' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} fill={i < r.stars ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  {r.text && (
                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>
                      {r.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{
      border: '1px solid var(--border-light)', borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
