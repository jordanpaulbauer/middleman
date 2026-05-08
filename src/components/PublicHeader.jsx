import React from 'react';
import { Link } from 'react-router-dom';

// Slim header for unauthenticated visitors landing on public pages
// (listing detail, profile, legal/SEO). Replaces the full Navbar.
export default function PublicHeader({ onSignIn }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 900,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border-light)',
      padding: '0 24px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 72, maxWidth: 1280, margin: '0 auto',
      }}>
        <Link to="/" style={{
          fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px',
          color: 'var(--rausch)', textDecoration: 'none',
        }}>
          middleman
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onSignIn}
            style={{
              padding: '8px 16px', background: 'transparent',
              border: 'none', borderRadius: 999,
              fontSize: 14, fontWeight: 600, color: 'var(--text)',
              cursor: 'pointer',
            }}
          >Sign in</button>
          <button
            onClick={onSignIn}
            style={{
              padding: '10px 18px', background: 'var(--rausch)',
              border: 'none', borderRadius: 999, color: 'white',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >Get started</button>
        </div>
      </div>
    </header>
  );
}
