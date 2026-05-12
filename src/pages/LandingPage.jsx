import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Mail, Lock, Eye, EyeOff, Sparkles,
  ShoppingBag, Zap, Users, ShieldCheck, Star, HandCoins,
} from 'lucide-react';
import Seo from '../components/Seo';
import { Auth } from '../services';

/**
 * The logged-out home page. Marketing hero on the left, an inline
 * login card on the right — no modal in the way. Below the fold: the
 * three pillars, how-it-works, and trust panels that match the About
 * page's voice, so a first-time visitor lands and can scroll-read the
 * whole pitch without ever hitting a popup.
 *
 * Auth resolves through Auth.login / Auth.socialAuth (same services
 * the AuthModal uses) — services.notify() then propagates the change
 * to App.jsx via the global subscribe() and the auth tree swaps in.
 */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--bg)' }}>
      <Seo
        title="MIDDLEMAN — The marketplace where someone else does the selling"
        description="List high-value items, find a closer to broker the deal, get paid through Stripe escrow. Lower fees on bigger deals."
      />

      {/* ── Hero with inline login ───────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(180deg, var(--rausch-light) 0%, transparent 100%)',
        padding: '60px 24px 80px',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto',
          display: 'grid', gap: 48,
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, 420px)',
          alignItems: 'center',
        }}
          className="landing-hero-grid"
        >
          {/* Left — marketing copy */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-light)',
              color: 'var(--rausch)', padding: '6px 12px', borderRadius: 999,
              fontSize: 13, fontWeight: 500, marginBottom: 22, letterSpacing: '-0.012em',
            }}>
              <Sparkles size={14} /> The commission marketplace
            </div>
            <h1 style={{
              fontSize: 'clamp(38px, 5.5vw, 60px)',
              fontWeight: 500, letterSpacing: '-1.5px',
              lineHeight: 1.05, margin: 0, color: 'var(--text)',
            }}>
              The marketplace where{' '}
              <span style={{ color: 'var(--rausch)' }}>someone else</span>{' '}
              does the selling.
            </h1>
            <p style={{
              fontSize: 18, lineHeight: 1.55, color: 'var(--text-secondary)',
              margin: '20px 0 0', maxWidth: 540,
            }}>
              List what you have. Independent closers find the buyer, broker
              the deal, and earn a commission only when it closes. Lower fees
              on bigger deals. Real humans, real escrow, real reviews.
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/about')}>
                How it works <ArrowRight size={16} />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('/faq')}>
                FAQ
              </button>
            </div>
          </div>

          {/* Right — inline login card */}
          <div style={{
            background: 'var(--bg)',
            borderRadius: 16,
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-lg)',
            padding: 28,
          }}>
            <LoginCard />
          </div>
        </div>
      </section>

      {/* ── Three pillars ────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <SectionHeading
            eyebrow="Who it's for"
            title="Three roles, one platform"
            subtitle="MIDDLEMAN connects three people who'd otherwise never find each other."
          />
          <div style={{
            display: 'grid', gap: 20, marginTop: 40,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}>
            <Pillar icon={<ShoppingBag size={22} />} title="Sellers"
              body="You've got the inventory — a vintage watch, surplus equipment, a one-off build. You don't have the time, the buyer list, or the patience to sell it yourself. List it, set a commission, let closers come to you." />
            <Pillar icon={<Zap size={22} />} title="Closers"
              body="You have the network, the eye, the hustle. Claim a listing, find a buyer, broker the deal. Walk away with a percentage on every closing — no inventory risk." />
            <Pillar icon={<Users size={22} />} title="Buyers"
              body="A curated stream of inventory presented by someone who actually wants the sale to happen. Payment runs through Stripe escrow until the seller confirms handoff." />
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────── */}
      <section style={{ padding: '60px 24px', background: 'var(--bg-subtle)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gap: 24,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}>
            <TrustItem icon={<Lock size={22} color="var(--blue)" />}
              title="Stripe escrow"
              body="Funds held by MIDDLEMAN until both parties confirm." />
            <TrustItem icon={<Star size={22} color="var(--yellow)" />}
              title="Double-blind reviews"
              body="Neither party sees the other's review until both submit." />
            <TrustItem icon={<ShieldCheck size={22} color="var(--green)" />}
              title="Earned badges"
              body="Every badge on a profile is computed from real activity." />
            <TrustItem icon={<HandCoins size={22} color="var(--rausch)" />}
              title="Tiered fees"
              body="4% on small deals dropping to 1% on six-figure deals." />
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section style={{
        padding: '72px 24px',
        background: 'linear-gradient(180deg, transparent 0%, var(--rausch-light) 100%)',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 32, fontWeight: 500, letterSpacing: '-0.6px',
            lineHeight: 1.15, margin: 0,
          }}>
            Ready to start?
          </h2>
          <p style={{
            fontSize: 16, color: 'var(--text-secondary)', marginTop: 12,
            lineHeight: 1.6,
          }}>
            Create an account in under a minute, or read the full story first.
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => scrollToLogin()}>
              Sign up free <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/about')}>
              Read more
            </button>
          </div>
        </div>
      </section>

      {/* Responsive: stack hero columns on narrow screens */}
      <style>{`
        @media (max-width: 920px) {
          .landing-hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </div>
  );
}

function scrollToLogin() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Inline login card ────────────────────────────────────────────
function LoginCard() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
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
      if (mode === 'forgot') {
        await Auth.resetPassword(email);
        setMode('login');
        return;
      }
      if (mode === 'login') {
        await Auth.login(email, password);
      } else {
        await Auth.register({ email, full_name: name, password });
      }
      // services.notify() propagates the auth change to App.jsx via
      // subscribe() — no need to lift state manually.
    } catch (err) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await Auth.socialAuth('google');
    } catch (err) {
      setError(err?.message || 'Could not start Google sign-in');
    }
  };

  return (
    <>
      <div style={{
        fontSize: 12, fontWeight: 500, color: 'var(--rausch)',
        letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
      </div>
      <h2 style={{
        fontSize: 22, fontWeight: 500, letterSpacing: '-0.4px',
        margin: '0 0 18px',
      }}>
        Welcome to <span style={{ color: 'var(--rausch)' }}>middleman</span>
      </h2>

      {error && (
        <div style={{
          background: 'var(--red-light)', color: 'var(--red)',
          padding: '10px 14px', borderRadius: 10, fontSize: 13.5, marginBottom: 14, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {mode === 'register' && (
            <FloatLabel label="Full Name" border>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
                placeholder="John Doe" required disabled={loading} />
            </FloatLabel>
          )}
          <FloatLabel label="Email" border={mode !== 'forgot'}>
            <input style={inputStyle} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com" required disabled={loading} />
          </FloatLabel>
          {mode !== 'forgot' && (
            <FloatLabel label="Password">
              <input style={{ ...inputStyle, paddingRight: 56 }}
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password" required disabled={loading} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 12, top: 18,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </FloatLabel>
          )}
        </div>

        {mode === 'login' && (
          <button type="button" onClick={() => setMode('forgot')}
            style={{
              alignSelf: 'flex-start', marginTop: 10,
              background: 'none', border: 'none', color: 'var(--text)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              textDecoration: 'underline', padding: 0,
            }}>
            Forgot password?
          </button>
        )}

        <button type="submit" disabled={loading}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: 14 }}>
          {loading ? (
            <div className="spinner" style={{ margin: '0 auto' }} />
          ) : mode === 'login' ? 'Continue' : mode === 'register' ? 'Create account' : 'Send reset link'}
        </button>
      </form>

      {mode !== 'forgot' && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0',
            color: 'var(--text-muted)', fontSize: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            or
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <button
            type="button"
            onClick={handleGoogle}
            style={{
              width: '100%', padding: '12px 16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'var(--bg)', border: '1px solid var(--text)',
              borderRadius: 10, cursor: 'pointer',
              fontSize: 14, fontWeight: 500, color: 'var(--text)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </>
      )}

      <p style={{
        marginTop: 18, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
      }}>
        {mode === 'login' ? (
          <>Don&apos;t have an account?{' '}
            <button type="button" onClick={() => setMode('register')}
              style={inlineLink}>Sign up</button>
          </>
        ) : mode === 'register' ? (
          <>Already have an account?{' '}
            <button type="button" onClick={() => setMode('login')}
              style={inlineLink}>Log in</button>
          </>
        ) : (
          <>Back to{' '}
            <button type="button" onClick={() => setMode('login')}
              style={inlineLink}>sign in</button>
          </>
        )}
      </p>

      <p style={{
        marginTop: 6, fontSize: 12, color: 'var(--text-light)', textAlign: 'center',
      }}>
        Having trouble?{' '}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('This will clear your local session and reload. Continue?')) {
              Auth.resetSession();
            }
          }}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0,
          }}
        >
          Reset session
        </button>
      </p>
    </>
  );
}

// Floating-label input wrapper that matches the visual style of the
// original AuthModal (Airbnb-style stacked inputs with a shared border).
function FloatLabel({ label, border, children }) {
  return (
    <div style={{
      position: 'relative',
      borderBottom: border ? '1px solid var(--border)' : 'none',
    }}>
      <label style={{
        position: 'absolute', top: 8, left: 14, fontSize: 10, fontWeight: 500,
        color: 'var(--text-muted)',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', border: 'none', outline: 'none',
  padding: '24px 14px 8px', fontSize: 15, color: 'var(--text)',
  background: 'transparent',
};

const inlineLink = {
  background: 'none', border: 'none', color: 'var(--text)',
  fontWeight: 500, cursor: 'pointer', fontSize: 13, textDecoration: 'underline',
  padding: 0,
};

// ── Section helpers (mirror AboutPage for visual consistency) ────
function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
      {eyebrow && (
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--rausch)',
          letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12,
        }}>{eyebrow}</div>
      )}
      <h2 style={{
        fontSize: 32, fontWeight: 500, letterSpacing: '-0.6px',
        lineHeight: 1.15, margin: 0, color: 'var(--text)',
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          fontSize: 16, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.55,
        }}>{subtitle}</p>
      )}
    </div>
  );
}

function Pillar({ icon, title, body }) {
  return (
    <div style={{
      padding: 26, background: 'var(--bg)', borderRadius: 16,
      border: '1px solid var(--border-light)',
      transition: 'transform 200ms, box-shadow 200ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'var(--rausch-light)', color: 'var(--rausch)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6, letterSpacing: '-0.012em' }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

function TrustItem({ icon, title, body }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, letterSpacing: '-0.012em' }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}
