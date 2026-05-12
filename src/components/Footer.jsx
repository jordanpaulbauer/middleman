import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mode } from '../services';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function Footer() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Switch role view if needed, then navigate.
  const goTo = (path, requiredMode) => {
    if (requiredMode && Mode.get() !== requiredMode) Mode.set(requiredMode);
    navigate(path);
  };

  const marketplace = [
    { label: 'Home', onClick: () => goTo('/browse', 'closer') },
    { label: 'Post a listing', onClick: () => goTo('/post', 'seller') },
    { label: 'Closings', onClick: () => navigate('/closings') },
    { label: 'Messages', onClick: () => navigate('/messages') },
  ];

  const company = [
    { label: 'About', onClick: () => navigate('/about') },
    { label: 'FAQ', onClick: () => navigate('/faq') },
  ];

  const legal = [
    { label: 'Terms', onClick: () => navigate('/terms') },
    { label: 'Privacy', onClick: () => navigate('/privacy') },
    { label: 'Cookies', onClick: () => navigate('/cookies') },
  ];

  return (
    <footer style={{
      borderTop: '1px solid var(--border-light)',
      background: 'var(--bg-subtle)',
      marginTop: 32,
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '40px 24px 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 24 : 32,
        }}>
          <Column title="Marketplace" links={marketplace} />
          <Column title="Company" links={company} />
          <Column title="Legal" links={legal} />
        </div>

        <div style={{
          height: 1, background: 'var(--border-light)',
          margin: '32px 0 16px',
        }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          fontSize: 13, color: 'var(--text-muted)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontWeight: 500, fontSize: 16, color: 'var(--rausch)',
              letterSpacing: '-0.4px',
            }}>middleman</span>
            <span>© 2026 MIDDLEMAN, Inc.</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <FooterTextLink onClick={() => navigate('/terms')}>Terms</FooterTextLink>
            <FooterTextLink onClick={() => navigate('/privacy')}>Privacy</FooterTextLink>
            <FooterTextLink onClick={() => navigate('/cookies')}>Cookies</FooterTextLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Column({ title, links }) {
  return (
    <div>
      <div style={{
        fontSize: 12, fontWeight: 500, letterSpacing: 0.6,
        color: 'var(--text)',
        marginBottom: 14,
      }}>
        {title}
      </div>
      <ul style={{
        listStyle: 'none', padding: 0, margin: 0,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {links.map((l) => (
          <li key={l.label}>
            <FooterLink onClick={l.onClick}>{l.label}</FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterLink({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', padding: 0,
        cursor: 'pointer', textAlign: 'left',
        fontSize: 13, color: 'var(--text-muted)',
        transition: 'color 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
    >
      {children}
    </button>
  );
}

function FooterTextLink({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', padding: 0,
        cursor: 'pointer',
        fontSize: 13, color: 'var(--text-muted)',
        transition: 'color 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
    >
      {children}
    </button>
  );
}
