import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '../services';
import Seo from '../components/Seo';

// Landing page for password-reset emails. Supabase's recovery link drops the
// user here with an access token in the URL hash; supabase-js auto-parses it
// and puts the session into a "recovery" state where updateUser({ password })
// works exactly once.
export default function AuthResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Friendly notice if the user lands here without coming through an email link.
  const [hasRecoveryToken, setHasRecoveryToken] = useState(true);
  useEffect(() => {
    // supabase-js consumes the URL hash on load; what's left tells us whether
    // a recovery flow was actually present.
    const hash = window.location.hash;
    if (!hash || (!hash.includes('access_token') && !hash.includes('type=recovery'))) {
      // Token was already consumed, or never present. Either way, give the
      // user a moment to see if a session establishes (Supabase needs a tick).
      setTimeout(async () => {
        const u = Auth.getUser();
        if (!u) setHasRecoveryToken(false);
      }, 600);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await Auth.updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message || 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrap}>
      <Seo title="Reset password" noIndex />
      <div style={card}>
        <h1 style={title}>Set a new password</h1>

        {!hasRecoveryToken ? (
          <>
            <p style={muted}>
              This link looks expired or already used. Request a new password reset
              from the sign-in screen.
            </p>
            <button onClick={() => navigate('/')} style={primaryBtn}>Back to sign in</button>
          </>
        ) : done ? (
          <>
            <p style={muted}>Password updated. Redirecting&hellip;</p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={errorBox}>{error}</div>}
            <div style={inputGroup}>
              <label style={inputLabel}>New password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputField}
                placeholder="At least 4 characters"
                required
                autoFocus
              />
            </div>
            <div style={inputGroup}>
              <label style={inputLabel}>Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={inputField}
                required
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              Show password
            </label>
            <button type="submit" disabled={loading} style={primaryBtn}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const wrap = {
  minHeight: '100vh',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24, background: 'linear-gradient(135deg, #fff0f3 0%, #ffffff 50%, #fff0f3 100%)',
};
const card = {
  maxWidth: 440, width: '100%', background: 'var(--bg)',
  border: '1px solid var(--border-light)', borderRadius: 18,
  padding: '32px 28px', boxShadow: 'var(--shadow-md)',
};
const title = { fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px', margin: '0 0 18px' };
const muted = { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 18px' };
const inputGroup = { marginBottom: 14 };
const inputLabel = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 };
const inputField = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 15, color: 'var(--text)', outline: 'none', background: 'transparent',
};
const primaryBtn = {
  width: '100%', padding: '14px 18px', background: 'var(--rausch)',
  color: 'white', border: 'none', borderRadius: 10,
  fontSize: 15, fontWeight: 600, cursor: 'pointer',
};
const errorBox = {
  background: 'var(--red-light)', color: 'var(--red)',
  padding: '10px 14px', borderRadius: 10, fontSize: 14, marginBottom: 14,
};
