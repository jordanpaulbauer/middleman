import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import { Chat, Listings } from '../services';
import { Auth } from '../services';
import { getUserById, formatTimeAgo } from '../data/demo';

export default function ChatPanel({ onClose, initialConversationId }) {
  const [activeConvId, setActiveConvId] = useState(initialConversationId || null);
  const [input, setInput] = useState('');
  const [, setTick] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const user = Auth.getUser();

  const conversations = Chat.getConversations();
  const activeConv = conversations.find(c => c.id === activeConvId);
  const messages = activeConvId ? Chat.getMessages(activeConvId) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (activeConvId) {
      Chat.markRead(activeConvId);
      inputRef.current?.focus();
    }
  }, [activeConvId]);

  const handleSend = () => {
    if (!input.trim() || !activeConvId) return;
    Chat.sendMessage(activeConvId, input.trim());
    setInput('');
    setTick(t => t + 1);
  };

  // Inbox view
  if (!activeConvId) {
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 1099 }} onClick={onClose} />
        <div className="slide-panel">
          <div className="slide-panel-header">
            <span style={{ fontWeight: 700, fontSize: 18 }}>Messages</span>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="slide-panel-body">
            {conversations.length === 0 ? (
              <div className="empty-state">
                <ImageIcon size={40} className="empty-state-icon" />
                <div className="empty-state-title">No messages yet</div>
                <div className="empty-state-desc">Start a conversation from a listing.</div>
              </div>
            ) : (
              conversations.map(c => (
                <div key={c.id} onClick={() => setActiveConvId(c.id)} style={{
                  padding: '14px 20px', display: 'flex', gap: 12, cursor: 'pointer',
                  borderBottom: '1px solid var(--border-light)',
                  background: c.unreadCount > 0 ? 'var(--accent-light)' : 'transparent',
                }}>
                  <div className="avatar">
                    {c.otherUser?.full_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.otherUser?.full_name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{formatTimeAgo(c.last_message_at)}</span>
                    </div>
                    {c.listing && (
                      <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, marginTop: 2 }}>
                        {c.listing.title}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                      {c.last_message_text}
                    </div>
                  </div>
                  {c.unreadCount > 0 && (
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: 'white',
                      fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center',
                    }}>{c.unreadCount}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  // Conversation view
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 1099 }} onClick={onClose} />
      <div className="slide-panel">
        <div className="slide-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setActiveConvId(null)}>
              <ArrowLeft size={20} />
            </button>
            <div className="avatar avatar-sm">{activeConv?.otherUser?.full_name?.[0]}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{activeConv?.otherUser?.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeConv?.listing?.title}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Listing context card */}
        {activeConv?.listing && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 12, background: 'var(--bg-subtle)' }}>
            <img src={activeConv.listing.photos?.[0]} alt="" style={{ width: 48, height: 36, borderRadius: 6, objectFit: 'cover' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{activeConv.listing.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>${activeConv.listing.price?.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="slide-panel-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map(m => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: 16,
                  background: isMine ? 'var(--accent)' : 'var(--bg-muted)',
                  color: isMine ? 'white' : 'var(--text)',
                  borderBottomRightRadius: isMine ? 4 : 16,
                  borderBottomLeftRadius: isMine ? 16 : 4,
                }}>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>{m.text}</div>
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7, textAlign: isMine ? 'right' : 'left' }}>
                    {formatTimeAgo(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" style={{ padding: '10px 14px' }} onClick={handleSend} disabled={!input.trim()}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
