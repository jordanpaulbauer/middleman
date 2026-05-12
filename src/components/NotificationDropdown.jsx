import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Trash2, DollarSign, MessageCircle, Tag, Star, CheckCircle, Sparkles } from 'lucide-react';
import { Notifications } from '../services';
import { formatTimeAgo } from '../data/demo';

const ICONS = {
  closing: DollarSign,
  completed: CheckCircle,
  claim: Tag,
  message: MessageCircle,
  review: Star,
  badge: Sparkles,
};

const COLORS = {
  closing: 'var(--blue)',
  completed: 'var(--green)',
  claim: 'var(--rausch)',
  message: 'var(--rausch)',
  review: 'var(--yellow)',
  badge: 'var(--rausch)',
};

export default function NotificationDropdown({ onClose, onOpenBadge }) {
  const navigate = useNavigate();
  const notifs = Notifications.get();

  const handleClick = (n) => {
    Notifications.markRead(n.id);
    if (n.type === 'badge') {
      // Re-open the celebration modal for this specific badge so users
      // can see what they earned and which ones are still locked.
      const key = n.data?.badge_key;
      if (key && onOpenBadge) onOpenBadge(key);
    } else if (n.type === 'closing' || n.type === 'completed') navigate('/closings');
    else if (n.type === 'claim') navigate('/browse');
    else if (n.type === 'review') navigate('/profile');
    onClose();
  };

  return (
    <div className="notif-dropdown" onClick={e => e.stopPropagation()}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500, fontSize: 16 }}>Notifications</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost btn-sm" onClick={() => Notifications.markAllRead()}>
            <Check size={14} /> Mark All Read
          </button>
          <button className="btn-ghost btn-sm" onClick={() => Notifications.clear()}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {notifs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No notifications
        </div>
      ) : (
        notifs.map(n => {
          const Icon = ICONS[n.type] || DollarSign;
          return (
            <div key={n.id} onClick={() => handleClick(n)} style={{
              padding: '12px 16px', display: 'flex', gap: 12, cursor: 'pointer',
              background: n.read ? 'transparent' : 'var(--accent-light)',
              borderBottom: '1px solid var(--border-light)',
              transition: 'background 150ms',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `${COLORS[n.type]}15`, color: COLORS[n.type],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {n.type === 'badge' && n.data?.icon
                  ? <span style={{ fontSize: 18 }}>{n.data.icon}</span>
                  : <Icon size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, color: 'var(--text)' }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{formatTimeAgo(n.created_at)}</div>
              </div>
              {!n.read && <div className="pulse-dot" style={{ marginTop: 4 }} />}
            </div>
          );
        })
      )}
    </div>
  );
}
