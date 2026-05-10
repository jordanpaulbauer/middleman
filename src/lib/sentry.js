import * as Sentry from '@sentry/react';

// Initialize Sentry as early as possible. Called once at the top of main.jsx
// before React renders so we capture any boot-time errors.
//
// We only initialize when a DSN is present; in dev without a DSN, the
// SDK stays a no-op and console.error is the only visibility.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    integrations: [
      Sentry.browserTracingIntegration(),
      // Session replay only fires when there's an error — useful for triage,
      // 0% sampled otherwise to keep volume manageable.
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
    ],
    // Performance: 10% of transactions in prod, 100% in dev for visibility.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session replay: 0% normally, 100% when an error happens.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Don't send PII in events automatically (we'll attach user manually
    // when we have it).
    sendDefaultPii: false,
    // Filter out noise from browser extensions, network blips, etc.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Network errors that aren't actionable
      'NetworkError when attempting to fetch resource',
      'Load failed',
    ],
  });
}

// Attach the current authenticated user to error reports so we can correlate
// issues with accounts. Call after auth resolves; pass null on logout.
export function setSentryUser(user) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      // username not used; Sentry treats id as the canonical key
    });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
