import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, X } from 'lucide-react';
import { Auth } from '../services';

export default function AuthModal({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'forgot') { await Auth.resetPassword(email); setMode('login'); return; }
      const user = mode === 'login' ? await Auth.login(email, password) : await Auth.register({ email, full_name: name });
      onAuth(user);
    } catch (err) { setError(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleSocial = async (provider) => {
    try { const user = await Auth.socialAuth(provider); onAuth(user); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 568 }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-light)',
          textAlign: 'center', position: 'relative',
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            {mode === 'login' ? 'Log in' : mode === 'register' ? 'Sign up' : 'Reset password'}
          </span>
        </div>

        <div style={{ padding: '24px 24px 32px' }}>
          {/* Welcome text */}
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20, letterSpacing: '-0.44px' }}>
            Welcome to <span style={{ color: 'var(--rausch)' }}>middleman</span>
          </h2>

          {error && (
            <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '12px 16px', borderRadius: 12, fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Airbnb-style stacked inputs with shared borders */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {mode === 'register' && (
                <div style={{ position: 'relative', borderBottom: '1px solid var(--border)' }}>
                  <label style={{ position: 'absolute', top: 8, left: 16, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name</label>
                  <input style={{ width: '100%', border: 'none', outline: 'none', padding: '26px 16px 8px', fontSize: 16, color: 'var(--text)', background: 'transparent' }}
                    value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
                </div>
              )}
              <div style={{ position: 'relative', borderBottom: mode !== 'forgot' ? '1px solid var(--border)' : 'none' }}>
                <label style={{ position: 'absolute', top: 8, left: 16, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</label>
                <input style={{ width: '100%', border: 'none', outline: 'none', padding: '26px 16px 8px', fontSize: 16, color: 'var(--text)', background: 'transparent' }}
                  type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
              </div>
              {mode !== 'forgot' && (
                <div style={{ position: 'relative' }}>
                  <label style={{ position: 'absolute', top: 8, left: 16, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Password</label>
                  <input style={{ width: '100%', border: 'none', outline: 'none', padding: '26px 16px 8px', fontSize: 16, color: 'var(--text)', background: 'transparent', paddingRight: 48 }}
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 12, top: 18, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, fontWeight: 600 }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              )}
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'left', marginTop: 12 }}>
                <button type="button" onClick={() => setMode('forgot')}
                  style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', marginTop: 16, padding: '14px 24px',
                background: loading ? 'var(--border)' : 'var(--rausch)',
                color: 'white', border: 'none', borderRadius: 8,
                fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 200ms',
              }}>
              {loading ? <div className="spinner" style={{ margin: '0 auto' }} /> :
                mode === 'login' ? 'Continue' : mode === 'register' ? 'Agree and continue' : 'Send reset link'}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '20px 0', color: 'var(--text-muted)', fontSize: 12, fontWeight: 400 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                or
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SocialButton onClick={() => handleSocial('google')}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                  label="Continue with Google" />
                <SocialButton onClick={() => handleSocial('apple')}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
                  label="Continue with Apple" />
                <SocialButton onClick={() => handleSocial('email')}
                  icon={<Mail size={20} />}
                  label="Continue with Email" />
              </div>
            </>
          )}

          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            {mode === 'login' ? (
              <>Don&apos;t have an account? <button type="button" onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Sign up</button></>
            ) : (
              <>Already have an account? <button type="button" onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Log in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SocialButton({ onClick, icon, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '12px 24px', display: 'flex', alignItems: 'center',
        gap: 12, background: hovered ? 'var(--bg-subtle)' : 'var(--bg)',
        border: '1px solid var(--text)', borderRadius: 8,
        fontSize: 14, fontWeight: 500, color: 'var(--text)',
        cursor: 'pointer', transition: 'background 150ms',
        justifyContent: 'center', position: 'relative',
      }}
    >
      <span style={{ position: 'absolute', left: 20 }}>{icon}</span>
      {label}
    </button>
  );
}
