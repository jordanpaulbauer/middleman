import React from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * Pops the first time a user earns a badge. Shows the earned badge with a
 * fun description, then lists the remaining badges they could still earn
 * along with the criteria — turns the unlock into a moment instead of a
 * silent state change.
 *
 * The parent decides what's "newly earned" (services/Badges.newlyEarned)
 * and what's "still to earn" (state().filter(b => !b.earned)). We only
 * render — no detection logic in here.
 */
export default function BadgeEarnedModal({ earned, remaining, onClose }) {
  if (!earned?.length) return null;
  // If multiple badges land at once (rare, but possible — e.g., first login
  // after a sweep), celebrate the first and queue the rest visually below.
  const hero = earned[0];
  const alsoEarned = earned.slice(1);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ animation: 'fadeIn 200ms' }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, animation: 'slideUp 250ms' }}
      >
        {/* Hero header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--rausch) 0%, #ff7a8a 100%)',
          color: 'white',
          padding: '36px 24px 28px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500, marginBottom: 12,
            opacity: 0.9, letterSpacing: '-0.012em',
          }}>
            <Sparkles size={14} /> New badge unlocked
          </div>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16 }}>{hero.icon}</div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: '-0.012em' }}>
            Congrats — you earned <span style={{ whiteSpace: 'nowrap' }}>{hero.label}!</span>
          </h2>
          <p style={{ margin: '12px auto 0', fontSize: 14, lineHeight: 1.5, maxWidth: 380, opacity: 0.95 }}>
            {hero.description}
          </p>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          {alsoEarned.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
                Plus
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alsoEarned.map(b => (
                  <BadgeRow key={b.key} badge={b} state="earned" />
                ))}
              </div>
            </div>
          )}

          {remaining?.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
                Still to earn
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {remaining.map(b => (
                  <BadgeRow key={b.key} badge={b} state="locked" />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', padding: '0 24px 24px' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ minWidth: 180 }}>
            Keep closing
          </button>
        </div>
      </div>
    </div>
  );
}

function BadgeRow({ badge, state }) {
  const isLocked = state === 'locked';
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '12px 14px',
      background: isLocked ? 'var(--bg-subtle)' : 'var(--rausch-light)',
      border: '1px solid ' + (isLocked ? 'var(--border-light)' : 'var(--rausch-light)'),
      borderRadius: 12,
    }}>
      <div style={{
        fontSize: 28, lineHeight: 1,
        filter: isLocked ? 'grayscale(1)' : 'none',
        opacity: isLocked ? 0.55 : 1,
      }}>
        {badge.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
          {badge.label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>
          {isLocked ? badge.howTo : badge.description}
        </div>
      </div>
    </div>
  );
}
