import React, { useEffect, useState } from 'react';

/**
 * Full-screen overlay shown after a Google (or other OAuth) redirect
 * lands back on the app, while supabase-js is parsing the URL hash /
 * exchanging the code for a session.
 *
 * Without this, the user sees the login modal flash again for ~5-10s
 * before the session resolves — making it feel like the OAuth flow
 * failed. With it, they see an unambiguous "we're signing you in"
 * state until auth resolves.
 *
 * Detection: presence of either #access_token= (implicit flow) or
 * ?code= (PKCE flow) in the URL when the app mounts.
 */
export default function OAuthCompletingOverlay({ done }) {
  // Probe the URL once on mount. We stash to state so a hash-clearing
  // supabase-js side effect doesn't make us unmount mid-flow.
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('access_token=') || /[?&]code=/.test(search);
  });

  // Once auth resolves, the parent flips `done` to true and we fade out.
  useEffect(() => {
    if (done && active) {
      // Tiny delay so the UI doesn't jump — gives the next view a moment
      // to mount underneath before we disappear.
      const t = setTimeout(() => setActive(false), 200);
      return () => clearTimeout(t);
    }
  }, [done, active]);

  // Safety net: if auth never resolves after 15s, show a recovery hint.
  const [tookTooLong, setTookTooLong] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setTookTooLong(true), 15000);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 20,
      animation: 'fadeIn 200ms',
    }}>
      <div className="spinner-dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.012em' }}>
        Signing you in…
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Just a moment — finishing up the handshake with Google.
      </div>
      {tookTooLong && (
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360 }}>
          This is taking longer than usual.{' '}
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            style={{ background: 'none', border: 'none', color: 'var(--text)', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}
          >
            Go home
          </button>{' '}
          and try again.
        </div>
      )}
    </div>
  );
}
