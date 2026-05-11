import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '../services';
import Seo from '../components/Seo';

// Landing page for email-confirmation links. Supabase appends an access_token
// to the URL hash; supabase-js auto-parses it on load. We just need to wait
// for the session to settle and then send the user home.
export default function AuthVerifyPage() {
  const navigate = useNavigate();
  const [state, setState] = useState('verifying'); // 'verifying' | 'success' | 'error'

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      const u = Auth.getUser();
      if (cancelled) return;
      if (u) {
        setState('success');
        setTimeout(() => navigate('/'), 1200);
      } else if (attempts > 20) {
        // ~4 seconds without a session arriving. Token likely expired or invalid.
        setState('error');
      } else {
        setTimeout(tick, 200);
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div style={wrap}>
      <Seo title="Confirm email" noIndex />
      <div style={card}>
        {state === 'verifying' && (
          <>
            <h1 style={title}>Confirming your email&hellip;</h1>
            <p style={muted}>One moment while we verify the link.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <h1 style={title}>You&rsquo;re in.</h1>
            <p style={muted}>Email confirmed. Sending you to the marketplace&hellip;</p>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 style={title}>This link expired</h1>
            <p style={muted}>
              Confirmation links are only valid for a short window. Try signing in
              with your email and password, or request a new link from the sign-in screen.
            </p>
            <button onClick={() => navigate('/')} style={primaryBtn}>Back to sign in</button>
          </>
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
  padding: '32px 28px', boxShadow: 'var(--shadow-md)', textAlign: 'center',
};
const title = { fontSize: 24, fontWeight: 500, letterSpacing: '-0.4px', margin: '0 0 12px' };
const muted = { fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 18px' };
const primaryBtn = {
  padding: '12px 20px', background: 'var(--rausch)',
  color: 'white', border: 'none', borderRadius: 10,
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
};
