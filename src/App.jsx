import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Auth, Mode, Badges } from './services';
import { subscribe } from './services';
import BadgeEarnedModal from './components/BadgeEarnedModal';
import OAuthCompletingOverlay from './components/OAuthCompletingOverlay';
import { ToastProvider } from './hooks/useToast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PublicHeader from './components/PublicHeader';
import AuthModal from './components/AuthModal';
import BrowsePage from './pages/BrowsePage';
import CloserDashboard from './pages/CloserDashboard';
import SellerDashboard from './pages/SellerDashboard';
import ClosingsPage from './pages/ClosingsPage';
import PostListing from './pages/PostListing';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CookiesPage from './pages/CookiesPage';
import ListingPage from './pages/ListingPage';
import PublicProfilePage from './pages/PublicProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import AuthResetPage from './pages/AuthResetPage';
import AuthVerifyPage from './pages/AuthVerifyPage';
import PayPage from './pages/PayPage';
import { setSentryUser } from './lib/sentry';

// Routes that don't require auth — readable for SEO and shareable.
// /auth/* is here too: the recovery + email-verify links land in a logged-out
// state and need to render their own dedicated page (no nav, no auth gate).
// /pay/:closingId is the buyer checkout — buyers don't have accounts.
const PUBLIC_PATHS = new Set([
  '/about', '/faq', '/help', '/terms', '/privacy', '/cookies',
  '/auth/reset', '/auth/verify',
]);
const PUBLIC_PREFIXES = ['/listing/', '/u/', '/pay/'];
const isPublicPath = (path) =>
  PUBLIC_PATHS.has(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));

export default function App() {
  const [user, setUser] = useState(Auth.getUser());
  const [, setTick] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [badgeCelebration, setBadgeCelebration] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Single subscription that drives both user-state sync AND the badge
  // check. The check has to run on every services notify (not just when
  // `user` changes) because most badge triggers — creating a listing,
  // completing a closing, getting a review — don't mutate currentUser.
  // A ref guards against re-popping the modal while one's already open.
  const badgeCelebrationRef = useRef(null);
  useEffect(() => { badgeCelebrationRef.current = badgeCelebration; }, [badgeCelebration]);

  useEffect(() => {
    const checkForNewBadges = () => {
      if (!Auth.isAuthenticated()) return;
      if (badgeCelebrationRef.current) return; // modal already open
      const newly = Badges.newlyEarned();
      if (!newly.length) return;
      const state = Badges.state();
      setBadgeCelebration({
        earned: newly,
        remaining: state.filter(b => !b.earned),
      });
      // Persist + drop notifications. Best-effort — if the write fails
      // we'll just see the modal again next session, no data loss.
      Badges.markSeen(newly.map(b => b.key)).catch(() => {});
    };

    const unsub = subscribe(() => {
      const next = Auth.getUser();
      setUser(next);
      setTick(t => t + 1);
      setSentryUser(next);
      checkForNewBadges();
    });
    // Run once on mount in case the user already has unseen badges from
    // a previous session.
    checkForNewBadges();
    return unsub;
  }, []);

  // Close the auth modal automatically once the user signs in.
  useEffect(() => { if (user) setShowAuthModal(false); }, [user]);

  // Notification-click hook: opens the celebration modal for a specific
  // badge so users can revisit the unlock from their inbox.
  const openBadgeCelebration = (badgeKey) => {
    const b = Badges.byKey(badgeKey);
    if (!b) return;
    const state = Badges.state();
    setBadgeCelebration({
      earned: [b],
      remaining: state.filter(s => !s.earned),
    });
  };

  const handleAuth = (u) => setUser(u);
  const openChat = (convId) => {
    navigate(convId ? `/messages?conv=${convId}` : '/messages');
  };

  const mode = Mode.get();
  const closerHome = '/browse';
  const sellerHome = '/seller';
  const homeForMode = mode === 'seller' ? sellerHome : closerHome;

  const RequireMode = ({ allowed, children }) => (
    mode === allowed ? children : <Navigate to={homeForMode} replace />
  );

  // ── Auth interstitials (reset / verify) and buyer checkout — render
  // full-bleed, no chrome. Reachable both logged-in and logged-out.
  const isInterstitial =
    location.pathname.startsWith('/auth/') || location.pathname.startsWith('/pay/');

  // OAuth callback overlay — covers the gap between landing back from
  // Google and supabase-js finishing the session handshake. Rendered
  // here (above every routing branch) so it shows regardless of which
  // tree React mounts during that window.
  const oauthOverlay = <OAuthCompletingOverlay done={!!user} />;

  if (isInterstitial) {
    return (
      <ToastProvider>
        {oauthOverlay}
        <Routes>
          <Route path="/auth/reset" element={<AuthResetPage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />
          <Route path="/pay/:closingId" element={<PayPage />} />
        </Routes>
      </ToastProvider>
    );
  }

  // ── Logged-out flow ──
  // Public routes render normally with a slim PublicHeader + Footer.
  // Everything else hits the AuthGate.
  if (!user) {
    if (!isPublicPath(location.pathname)) {
      return (
        <ToastProvider>
          {oauthOverlay}
          <AuthGate>
            <AuthModal onAuth={handleAuth} />
          </AuthGate>
        </ToastProvider>
      );
    }
    return (
      <ToastProvider>
        {oauthOverlay}
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <PublicHeader onSignIn={() => setShowAuthModal(true)} />
          <main style={{ flex: 1 }}>
            <PublicRoutes onRequireAuth={() => setShowAuthModal(true)} />
          </main>
          <Footer />
          {showAuthModal && <AuthModal onAuth={handleAuth} onClose={() => setShowAuthModal(false)} />}
        </div>
      </ToastProvider>
    );
  }

  // ── Logged-in flow ──
  return (
    <ToastProvider>
      {oauthOverlay}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar onOpenChat={openChat} user={user} onOpenBadge={openBadgeCelebration} />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to={homeForMode} replace />} />
            <Route path="/browse" element={
              <RequireMode allowed="closer"><BrowsePage onOpenChat={openChat} /></RequireMode>
            } />
            <Route path="/closer" element={
              <RequireMode allowed="closer"><CloserDashboard onOpenChat={openChat} /></RequireMode>
            } />
            <Route path="/seller" element={
              <RequireMode allowed="seller"><SellerDashboard onOpenChat={openChat} /></RequireMode>
            } />
            <Route path="/post" element={
              <RequireMode allowed="seller"><PostListing /></RequireMode>
            } />
            <Route path="/closings" element={<ClosingsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FAQPage />} />
            {/* Backwards compat: existing /help links keep working. */}
            <Route path="/help" element={<Navigate to="/faq" replace />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/listing/:id" element={<ListingPage />} />
            <Route path="/u/:userId" element={<PublicProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <Footer />

        {badgeCelebration && (
          <BadgeEarnedModal
            earned={badgeCelebration.earned}
            remaining={badgeCelebration.remaining}
            onClose={() => setBadgeCelebration(null)}
          />
        )}
      </div>
    </ToastProvider>
  );
}

// Routes available without authentication. Listing/profile pages also support
// a `noAuth` claim path that triggers the sign-in modal via onRequireAuth.
function PublicRoutes({ onRequireAuth }) {
  return (
    <Routes>
      <Route path="/about" element={<AboutPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/help" element={<Navigate to="/faq" replace />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/listing/:id" element={<ListingPage onRequireAuth={onRequireAuth} />} />
      <Route path="/u/:userId" element={<PublicProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// Branded background behind the auth modal for logged-out visitors.
function AuthGate({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff0f3 0%, #ffffff 50%, #fff0f3 100%)',
      display: 'flex', flexDirection: 'column',
    }}>
      <header style={{ padding: '24px 32px' }}>
        <div style={{
          fontWeight: 500, fontSize: 22, letterSpacing: '-0.5px',
          color: 'var(--rausch)',
        }}>middleman</div>
      </header>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ maxWidth: 1080, width: '100%', display: 'grid',
          gridTemplateColumns: '1fr', gap: 48, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: 44, lineHeight: 1.1, fontWeight: 500,
              letterSpacing: '-1px', margin: '0 0 16px',
            }}>
              The marketplace where <span style={{ color: 'var(--rausch)' }}>closers</span> earn
              and <span style={{ color: 'var(--rausch)' }}>sellers</span> move inventory.
            </h1>
            <p style={{
              fontSize: 17, color: 'var(--text-muted)', margin: '0 auto',
              maxWidth: 640, lineHeight: 1.5,
            }}>
              List items for sale or claim listings to close. Sign in to continue.
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
