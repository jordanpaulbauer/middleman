import React from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '../components/Seo';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <>
      <Seo title="Page not found" noIndex />
      <div style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center',
      }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{
            fontSize: 64, fontWeight: 500, color: 'var(--rausch)',
            letterSpacing: '-2px', lineHeight: 1, marginBottom: 16,
          }}>404</div>
          <h1 style={{
            fontSize: 26, fontWeight: 500, margin: '0 0 12px',
            letterSpacing: '-0.4px',
          }}>This page doesn&rsquo;t exist.</h1>
          <p style={{
            fontSize: 15, color: 'var(--text-muted)',
            lineHeight: 1.5, margin: '0 0 24px',
          }}>The link might be broken, or the listing has been removed.</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px', background: 'var(--rausch)',
              color: 'white', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
            }}
          >Back to home</button>
        </div>
      </div>
    </>
  );
}
