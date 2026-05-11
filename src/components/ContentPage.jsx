import React from 'react';
import Seo from './Seo';

export default function ContentPage({ title, seoTitle, seoDescription, lastUpdated, intro, sections, footer, noIndex }) {
  return (
    <article style={{
      maxWidth: 760, margin: '0 auto', padding: '48px 24px 64px',
      color: 'var(--text)',
    }}>
      <Seo
        title={seoTitle || title}
        description={seoDescription || intro}
        noIndex={noIndex}
      />
      <header style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 36, lineHeight: 1.15, fontWeight: 500,
          letterSpacing: '-0.8px', margin: 0,
        }}>{title}</h1>
        {lastUpdated && (
          <div style={{
            fontSize: 13, color: 'var(--text-muted)', marginTop: 8,
          }}>Last updated · {lastUpdated}</div>
        )}
      </header>

      {intro && (
        <p style={{
          fontSize: 17, lineHeight: 1.55, color: 'var(--text-secondary)',
          marginBottom: 32,
        }}>{intro}</p>
      )}

      {sections?.map((s, i) => (
        <section key={i} style={{ marginBottom: 28 }}>
          <h2 style={{
            fontSize: 20, fontWeight: 500, letterSpacing: '-0.2px',
            margin: '0 0 12px',
          }}>{s.heading}</h2>
          {Array.isArray(s.body)
            ? s.body.map((p, pi) => (
              <p key={pi} style={paragraphStyle}>{p}</p>
            ))
            : <p style={paragraphStyle}>{s.body}</p>
          }
          {s.list && (
            <ul style={{ paddingLeft: 22, margin: '8px 0 0' }}>
              {s.list.map((li, li_i) => (
                <li key={li_i} style={{ ...paragraphStyle, marginBottom: 6 }}>{li}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {footer && (
        <div style={{
          marginTop: 40, padding: '20px 24px',
          background: 'var(--bg-subtle)', borderRadius: 12,
          fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5,
        }}>{footer}</div>
      )}
    </article>
  );
}

const paragraphStyle = {
  fontSize: 15, lineHeight: 1.65, color: 'var(--text)',
  margin: '0 0 12px',
};
