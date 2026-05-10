import React from 'react';
import { Sentry } from '../lib/sentry';

// React requires class components for componentDidCatch / getDerivedStateFromError.
// Catches any render error in the tree below and shows a recoverable fallback.
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Report to Sentry (no-op if DSN isn't configured).
    Sentry?.captureException?.(error, {
      contexts: { react: { componentStack: info?.componentStack } },
    });
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
    if (typeof window !== 'undefined') window.location.assign('/');
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, background: 'var(--bg)', color: 'var(--text)',
        fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: 480, textAlign: 'center',
          border: '1px solid var(--border-light, #ebebeb)',
          borderRadius: 16, padding: '40px 32px',
          background: 'var(--bg, #fff)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            fontWeight: 800, fontSize: 18, color: 'var(--rausch, #ff385c)',
            marginBottom: 12, letterSpacing: '-0.4px',
          }}>middleman</div>
          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: '0 0 12px',
            letterSpacing: '-0.4px',
          }}>Something broke on our end.</h1>
          <p style={{
            fontSize: 15, color: 'var(--text-muted, #6a6a6a)',
            lineHeight: 1.5, margin: '0 0 24px',
          }}>The page hit an unexpected error. Going back to the home page usually fixes it.</p>
          {import.meta.env.DEV && this.state.error?.message && (
            <pre style={{
              textAlign: 'left', fontSize: 12, background: '#f7f7f7',
              padding: 12, borderRadius: 8, overflow: 'auto', marginBottom: 20,
              color: '#c13515',
            }}>{String(this.state.error.message)}</pre>
          )}
          <button
            onClick={this.reset}
            style={{
              padding: '12px 24px', background: 'var(--rausch, #ff385c)',
              color: 'white', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >Back to home</button>
        </div>
      </div>
    );
  }
}
