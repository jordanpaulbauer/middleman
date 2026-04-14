import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from './services';
import { subscribe } from './services';
import { ToastProvider } from './hooks/useToast';
import Navbar from './components/Navbar';
import ChatPanel from './components/ChatPanel';
import AuthModal from './components/AuthModal';
import BrowsePage from './pages/BrowsePage';
import CloserDashboard from './pages/CloserDashboard';
import SellerDashboard from './pages/SellerDashboard';
import ClosingsPage from './pages/ClosingsPage';
import PostListing from './pages/PostListing';
import ProfilePage from './pages/ProfilePage';

// Demo mode: auto-login
const USE_DEMO_AUTH = true;

export default function App() {
  const [user, setUser] = useState(USE_DEMO_AUTH ? Auth.getUser() : null);
  const [chatOpen, setChatOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribe(() => {
      setUser(Auth.getUser());
      setTick(t => t + 1);
    });
    return unsub;
  }, []);

  const handleAuth = (u) => setUser(u);
  const openChat = () => setChatOpen(true);
  const closeChat = () => setChatOpen(false);

  return (
    <ToastProvider>
      {!user && !USE_DEMO_AUTH && <AuthModal onAuth={handleAuth} />}

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar onOpenChat={openChat} user={user} />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/browse" replace />} />
            <Route path="/browse" element={<BrowsePage onOpenChat={openChat} />} />
            <Route path="/closer" element={<CloserDashboard onOpenChat={openChat} />} />
            <Route path="/seller" element={<SellerDashboard onOpenChat={openChat} />} />
            <Route path="/closings" element={<ClosingsPage />} />
            <Route path="/post" element={<PostListing />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>

        {chatOpen && <ChatPanel onClose={closeChat} />}
      </div>
    </ToastProvider>
  );
}
