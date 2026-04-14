import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageCircle, Bell, User, LogOut, Settings, ChevronDown, Menu, Globe } from 'lucide-react';
import { Auth, Chat, Notifications } from '../services';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar({ onOpenChat, user }) {
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const unreadMessages = Chat.getTotalUnread();
  const unreadNotifs = Notifications.getUnreadCount();

  const tabs = [
    { to: '/browse', label: 'Listings' },
    { to: '/closer', label: 'Closer' },
    { to: '/seller', label: 'Seller' },
    { to: '/closings', label: 'Closings' },
    { to: '/post', label: 'Post' },
  ];

  return (
    <nav style={{
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky', top: 0, zIndex: 900,
      padding: '0 24px 0 24px',
    }}>
      {/* Top row: Logo, nav tabs centered, right actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 80, maxWidth: 1280, margin: '0 auto',
      }}>
        {/* Logo */}
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', cursor: 'pointer', flexShrink: 0 }}
             onClick={() => navigate('/browse')}>
          <span style={{ color: 'var(--rausch)' }}>middleman</span>
        </div>

        {/* Center: Tab Links (Airbnb-style bottom-border active) */}
        <div style={{ display: 'flex', gap: 0, height: '100%' }}>
          {tabs.map(t => (
            <NavLink key={t.to} to={t.to}
              style={({ isActive }) => ({
                padding: '0 16px',
                height: '100%',
                display: 'flex', alignItems: 'center',
                fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--text)' : '2px solid transparent',
                transition: 'all 200ms',
                letterSpacing: 'normal',
              })}>
              {t.label}
            </NavLink>
          ))}
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {/* Chat */}
          <button onClick={onOpenChat}
            style={{
              position: 'relative', width: 40, height: 40, borderRadius: '50%',
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text)', transition: 'background 200ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <MessageCircle size={20} />
            {unreadMessages > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9,
                background: 'var(--rausch)', color: 'white', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                border: '2px solid white',
              }}>{unreadMessages}</span>
            )}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
              style={{
                position: 'relative', width: 40, height: 40, borderRadius: '50%',
                border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text)', transition: 'background 200ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Bell size={20} />
              {unreadNotifs > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9,
                  background: 'var(--rausch)', color: 'white', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  border: '2px solid white',
                }}>{unreadNotifs}</span>
              )}
            </button>
            {showNotifs && <NotificationDropdown onClose={() => setShowNotifs(false)} />}
          </div>

          {/* User Menu (Airbnb pill button: hamburger + avatar) */}
          <div style={{ position: 'relative', marginLeft: 8 }}>
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '5px 5px 5px 12px',
                border: '1px solid var(--border)', borderRadius: 21, height: 42,
                background: 'var(--bg)', cursor: 'pointer',
                boxShadow: showUserMenu ? 'var(--shadow-md)' : 'none',
                transition: 'box-shadow 200ms',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => { if (!showUserMenu) e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Menu size={16} color="var(--text)" />
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--text)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600,
              }}>
                {user?.photo_url
                  ? <img src={user.photo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : (user?.full_name?.[0] || 'U')
                }
              </div>
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 240, background: 'var(--bg)', borderRadius: 12,
                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-light)',
                padding: '8px 0', zIndex: 1200, animation: 'fadeIn 150ms ease',
              }}>
                <div style={{ padding: '2px 0' }}>
                  <MenuButton icon={<User size={16} />} label="Profile"
                    onClick={() => { navigate('/profile'); setShowUserMenu(false); }} bold />
                  <MenuButton icon={<MessageCircle size={16} />} label="Messages"
                    onClick={() => { onOpenChat(); setShowUserMenu(false); }}
                    badge={unreadMessages > 0 ? unreadMessages : null} />
                  <MenuButton icon={<Settings size={16} />} label="Settings"
                    onClick={() => { navigate('/profile'); setShowUserMenu(false); }} />
                </div>
                <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                <div style={{ padding: '2px 0' }}>
                  <MenuButton icon={<Globe size={16} />} label="Become a Host"
                    onClick={() => { navigate('/post'); setShowUserMenu(false); }} />
                </div>
                <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                <div style={{ padding: '2px 0' }}>
                  <MenuButton icon={<LogOut size={16} />} label="Log out"
                    onClick={() => setShowUserMenu(false)} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop to close dropdowns */}
      {(showNotifs || showUserMenu) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
          onClick={() => { setShowNotifs(false); setShowUserMenu(false); }} />
      )}
    </nav>
  );
}

function MenuButton({ icon, label, onClick, bold, badge }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', background: hovered ? 'var(--bg-subtle)' : 'transparent',
        border: 'none', cursor: 'pointer', fontSize: 14,
        fontWeight: bold ? 600 : 400, color: 'var(--text)',
        transition: 'background 150ms',
      }}
    >
      {icon}
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {badge && <span style={{
        minWidth: 20, height: 20, borderRadius: 10,
        background: 'var(--rausch)', color: 'white', fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
      }}>{badge}</span>}
    </button>
  );
}
