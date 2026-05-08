import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, MoreHorizontal, ImageIcon, Smile, ExternalLink, ArrowLeft } from 'lucide-react';
import { Auth, Chat } from '../services';
import { formatTimeAgo } from '../data/demo';
import Seo from '../components/Seo';
import { useIsMobile, useIsNarrow } from '../hooks/useMediaQuery';

const NAV_HEIGHT_DESKTOP = 80;
const NAV_HEIGHT_NARROW = 64;
const LEFT_RAIL = 360;
const RIGHT_RAIL = 320;

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConv = searchParams.get('conv');
  const user = Auth.getUser();

  const [activeConvId, setActiveConvId] = useState(initialConv || null);
  const [tab, setTab] = useState('all'); // 'all' | 'closers' | 'sellers'
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [, setTick] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isMobile = useIsMobile();
  const isNarrow = useIsNarrow();
  const navHeight = isNarrow ? NAV_HEIGHT_NARROW : NAV_HEIGHT_DESKTOP;

  const insertEmoji = (e) => {
    const el = inputRef.current;
    if (!el) { setInput(input + e); return; }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = input.slice(0, start) + e + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + e.length, start + e.length);
    });
  };

  const conversations = Chat.getConversations();

  // Categorize: who is the OTHER party in each conversation?
  // - I'm the seller in conv → other is a closer (chat with closers)
  // - I'm the closer in conv → other is a seller (chat with sellers)
  const enriched = useMemo(() => conversations.map(c => ({
    ...c,
    otherIsCloser: c.seller_id === user?.id,
  })), [conversations, user?.id]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (tab === 'closers') list = list.filter(c => c.otherIsCloser);
    if (tab === 'sellers') list = list.filter(c => !c.otherIsCloser);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c =>
        c.otherUser?.full_name?.toLowerCase().includes(q) ||
        c.listing?.title?.toLowerCase().includes(q) ||
        c.last_message_text?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
  }, [enriched, tab, query]);

  const counts = useMemo(() => ({
    all: enriched.length,
    closers: enriched.filter(c => c.otherIsCloser).length,
    sellers: enriched.filter(c => !c.otherIsCloser).length,
  }), [enriched]);

  // Auto-select first conversation if none selected (desktop only — on mobile,
  // start on the inbox view so the user can pick).
  useEffect(() => {
    if (!isMobile && !activeConvId && filtered.length > 0) {
      setActiveConvId(filtered[0].id);
    }
  }, [activeConvId, filtered, isMobile]);

  const activeConv = enriched.find(c => c.id === activeConvId);
  const messages = activeConvId ? Chat.getMessages(activeConvId) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]);

  useEffect(() => {
    if (activeConvId) {
      Chat.markRead(activeConvId);
      inputRef.current?.focus();
      // Keep URL in sync
      if (searchParams.get('conv') !== activeConvId) {
        setSearchParams({ conv: activeConvId }, { replace: true });
      }
    }
  }, [activeConvId]);

  const handleSend = () => {
    if (!input.trim() || !activeConvId) return;
    Chat.sendMessage(activeConvId, input.trim());
    setInput('');
    setTick(t => t + 1);
  };

  // Layout: 3-pane on desktop, 2-pane on narrow (no listing rail), 1-pane on mobile.
  const showLeft = !isMobile || !activeConvId;
  const showMiddle = !isMobile || !!activeConvId;
  const showRight = !isNarrow; // desktop-only

  const gridCols = isMobile
    ? '1fr'
    : isNarrow
      ? `${LEFT_RAIL}px 1fr`
      : `${LEFT_RAIL}px 1fr ${RIGHT_RAIL}px`;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridCols,
      height: `calc(100vh - ${navHeight}px)`,
      background: 'var(--bg)',
    }}>
      <Seo title="Messages" noIndex />
      {/* ── LEFT RAIL: Conversation list ── */}
      <aside style={{
        borderRight: !isMobile ? '1px solid var(--border-light)' : 'none',
        display: showLeft ? 'flex' : 'none',
        flexDirection: 'column', minHeight: 0,
        background: 'var(--bg)',
      }}>
        <div style={{ padding: '20px 20px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.4px' }}>
              Messages
            </h2>
            <button title="More" style={iconBtn}>
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-subtle)', borderRadius: 999,
            padding: '10px 14px',
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search messages"
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: 14, color: 'var(--text)',
              }}
            />
          </div>

          {/* Tab segmented control */}
          <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
            <TabPill active={tab === 'all'} count={counts.all} onClick={() => setTab('all')}>All</TabPill>
            <TabPill active={tab === 'closers'} count={counts.closers} onClick={() => setTab('closers')}>Closers</TabPill>
            <TabPill active={tab === 'sellers'} count={counts.sellers} onClick={() => setTab('sellers')}>Sellers</TabPill>
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 16px' }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)',
              fontSize: 14,
            }}>
              {query ? 'No conversations match your search.' : 'No conversations yet.'}
            </div>
          ) : (
            filtered.map(c => (
              <ConversationRow
                key={c.id}
                conv={c}
                active={c.id === activeConvId}
                onClick={() => setActiveConvId(c.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── MIDDLE: Active thread ── */}
      <section style={{
        display: showMiddle ? 'flex' : 'none',
        flexDirection: 'column', minHeight: 0,
        background: 'var(--bg)',
      }}>
        {!activeConv ? (
          <EmptyThread />
        ) : (
          <>
            {/* Header */}
            <header style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isMobile ? '10px 16px' : '14px 24px',
              borderBottom: '1px solid var(--border-light)',
              minHeight: 64,
            }}>
              {isMobile && (
                <button
                  onClick={() => setActiveConvId(null)}
                  aria-label="Back to inbox"
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text)',
                  }}
                ><ArrowLeft size={18} /></button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <Avatar name={activeConv.otherUser?.full_name} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeConv.otherUser?.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeConv.otherIsCloser ? 'Closer' : 'Seller'}
                    {activeConv.listing && ` · ${activeConv.listing.title}`}
                  </div>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '24px 24px 8px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {messages.map((m, i) => {
                const isMine = m.sender_id === user?.id;
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const samePrev = prev && prev.sender_id === m.sender_id;
                const sameNext = next && next.sender_id === m.sender_id;
                const showAvatar = !isMine && !sameNext;
                const showTime = !next || (new Date(next.created_at) - new Date(m.created_at)) > 5 * 60 * 1000;
                return (
                  <MessageBubble
                    key={m.id}
                    text={m.text}
                    time={m.created_at}
                    isMine={isMine}
                    samePrev={samePrev}
                    sameNext={sameNext}
                    showAvatar={showAvatar}
                    showTime={showTime}
                    senderName={activeConv.otherUser?.full_name}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div style={{
              padding: '12px 24px 18px',
              borderTop: '1px solid var(--border-light)',
              position: 'relative',
            }}>
              {showEmoji && (
                <EmojiPicker
                  onPick={(e) => { insertEmoji(e); setShowEmoji(false); }}
                  onClose={() => setShowEmoji(false)}
                />
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-subtle)', borderRadius: 999,
                padding: '4px 4px 4px 16px',
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Aa"
                  style={{
                    flex: 1, border: 'none', background: 'transparent', outline: 'none',
                    fontSize: 15, color: 'var(--text)', padding: '10px 0',
                  }}
                />
                <button
                  title="Emoji"
                  onClick={() => setShowEmoji(s => !s)}
                  style={{
                    ...iconBtn,
                    color: showEmoji ? 'var(--rausch)' : 'var(--text-muted)',
                    background: showEmoji ? 'var(--rausch-light)' : 'transparent',
                  }}
                >
                  <Smile size={18} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: input.trim() ? 'var(--rausch)' : 'transparent',
                    color: input.trim() ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'background 200ms',
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── RIGHT RAIL: Listing context ── */}
      <aside style={{
        display: showRight ? 'block' : 'none',
        borderLeft: '1px solid var(--border-light)',
        background: 'var(--bg)',
        overflowY: 'auto',
      }}>
        {activeConv?.listing ? (
          <ListingPane
            listing={activeConv.listing}
            otherUser={activeConv.otherUser}
            otherIsCloser={activeConv.otherIsCloser}
          />
        ) : (
          <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>
            Select a conversation to see listing details.
          </div>
        )}
      </aside>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────

function TabPill({ active, count, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 12px', borderRadius: 999,
        border: 'none', cursor: 'pointer',
        background: active ? 'var(--text)' : 'var(--bg-subtle)',
        color: active ? 'white' : 'var(--text)',
        fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 200ms',
      }}
    >
      {children}
      <span style={{
        fontSize: 11, fontWeight: 600, opacity: active ? 0.8 : 0.5,
      }}>{count}</span>
    </button>
  );
}

function ConversationRow({ conv, active, onClick }) {
  const [hover, setHover] = useState(false);
  const bg = active ? 'var(--bg-subtle)' : (hover ? 'var(--bg-subtle)' : 'transparent');
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 12,
        cursor: 'pointer', background: bg, transition: 'background 150ms',
        marginBottom: 2,
      }}
    >
      <Avatar name={conv.otherUser?.full_name} size={48} unread={conv.unreadCount > 0} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 14, fontWeight: conv.unreadCount > 0 ? 700 : 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: 'var(--text)',
          }}>
            {conv.otherUser?.full_name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {formatTimeAgo(conv.last_message_at)}
          </span>
        </div>
        {conv.listing && (
          <div style={{
            fontSize: 12, color: 'var(--rausch)', fontWeight: 500, marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {conv.listing.title}
          </div>
        )}
        <div style={{
          fontSize: 13, color: conv.unreadCount > 0 ? 'var(--text)' : 'var(--text-muted)',
          fontWeight: conv.unreadCount > 0 ? 500 : 400,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2,
        }}>
          {conv.last_message_text || 'Started a conversation'}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ text, time, isMine, samePrev, sameNext, showAvatar, showTime, senderName }) {
  // Tighten radii on adjacent same-sender messages (Messenger-style stacking)
  const topRadius = 18;
  const bottomRadius = 18;
  const tightTop = samePrev ? 4 : topRadius;
  const tightBottom = sameNext ? 4 : bottomRadius;

  return (
    <div style={{
      display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
      gap: 8, marginTop: samePrev ? 2 : 8,
    }}>
      {!isMine && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar && <Avatar name={senderName} size={28} />}
        </div>
      )}
      <div style={{
        maxWidth: '70%',
        display: 'flex', flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
      }}>
        <div style={{
          padding: '10px 14px',
          background: isMine ? 'var(--rausch)' : 'var(--bg-muted)',
          color: isMine ? 'white' : 'var(--text)',
          fontSize: 14, lineHeight: 1.4,
          borderRadius: 18,
          borderTopRightRadius: isMine ? tightTop : topRadius,
          borderBottomRightRadius: isMine ? tightBottom : bottomRadius,
          borderTopLeftRadius: isMine ? topRadius : tightTop,
          borderBottomLeftRadius: isMine ? bottomRadius : tightBottom,
          wordBreak: 'break-word',
        }}>
          {text}
        </div>
        {showTime && (
          <div style={{
            fontSize: 11, color: 'var(--text-light)', marginTop: 4, padding: '0 8px',
          }}>
            {formatTimeAgo(time)}
          </div>
        )}
      </div>
    </div>
  );
}

function ListingPane({ listing, otherUser, otherIsCloser }) {
  const navigate = useNavigate();
  const photo = listing.photos?.[0];
  const payout = Math.round((listing.price || 0) * (listing.commission || 0) / 100);
  return (
    <div style={{ padding: 20 }}>
      <div style={{
        textAlign: 'center', paddingBottom: 18, borderBottom: '1px solid var(--border-light)',
        marginBottom: 18,
      }}>
        <Avatar name={otherUser?.full_name} size={72} />
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 10 }}>
          {otherUser?.full_name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {otherIsCloser ? 'Closer' : 'Seller'}
          {otherUser?.location && ` · ${otherUser.location}`}
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
        Listing
      </div>

      <div style={{
        borderRadius: 14, overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)', marginBottom: 12,
      }}>
        {photo && (
          <img src={photo} alt={listing.title} style={{
            width: '100%', height: 160, objectFit: 'cover', display: 'block',
          }} />
        )}
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 8 }}>
            {listing.title}
          </div>
          <div style={{
            display: 'inline-block', background: 'var(--green-light)', color: 'var(--green)',
            fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
            marginBottom: 8,
          }}>
            ${payout.toLocaleString()} payout
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            ${listing.price?.toLocaleString()} asking · {listing.commission}% commission
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            <Status status={listing.status} />
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate(`/listing/${listing.id}`)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          border: '1px solid var(--border)', background: 'var(--bg)',
          fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <ExternalLink size={14} /> View listing
      </button>
    </div>
  );
}

function Status({ status }) {
  const map = {
    open: { label: 'Available', color: 'var(--green)' },
    claimed: { label: 'Claimed', color: 'var(--yellow)' },
    negotiating: { label: 'Negotiating', color: 'var(--blue)' },
    sold: { label: 'Sold', color: 'var(--text-muted)' },
  };
  const s = map[status] || map.open;
  return <span style={{ color: s.color, fontWeight: 600 }}>● {s.label}</span>;
}

function Avatar({ name, size = 40, unread = false }) {
  const initial = name?.[0]?.toUpperCase() || '?';
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--text)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.4), fontWeight: 600,
      }}>{initial}</div>
      {unread && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 12, height: 12, borderRadius: '50%',
          background: 'var(--rausch)', border: '2px solid var(--bg)',
        }} />
      )}
    </div>
  );
}

function EmptyThread() {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 8, color: 'var(--text-muted)', padding: 24,
    }}>
      <ImageIcon size={42} style={{ opacity: 0.3 }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
        Select a conversation
      </div>
      <div style={{ fontSize: 13 }}>Pick a chat from the left to start messaging.</div>
    </div>
  );
}

const iconBtn = {
  width: 36, height: 36, borderRadius: '50%',
  border: 'none', background: 'transparent', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text)',
};

const EMOJI_GROUPS = [
  { label: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥳','🤗','🤔'] },
  { label: 'Gestures', emojis: ['👍','👎','👌','✌️','🤞','🤟','🤘','👈','👉','👆','👇','✋','🤚','🖐️','🖖','👋','🤙','💪','🙏','👏','🙌','🤝','👊','✊'] },
  { label: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'] },
  { label: 'Money & Deals', emojis: ['💰','💵','💴','💶','💷','💸','💳','🧾','💹','🤑','🏷️','📈','📉','📊','✅','🔥','⭐','✨','🎉','🎊','🚀','⏰','🤝'] },
];

function EmojiPicker({ onPick, onClose }) {
  return (
    <>
      {/* Backdrop closes the picker on outside click */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      />
      <div
        style={{
          position: 'absolute', right: 60, bottom: 70,
          width: 320, maxHeight: 320, overflowY: 'auto',
          background: 'var(--bg)', border: '1px solid var(--border-light)',
          borderRadius: 14, boxShadow: 'var(--shadow-lg)',
          padding: 12, zIndex: 51,
        }}
        onClick={e => e.stopPropagation()}
      >
        {EMOJI_GROUPS.map((g, gi) => (
          <div key={g.label} style={{ marginBottom: gi === EMOJI_GROUPS.length - 1 ? 0 : 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              textTransform: 'uppercase', color: 'var(--text-muted)',
              padding: '0 4px 6px',
            }}>{g.label}</div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2,
            }}>
              {g.emojis.map(e => (
                <button
                  key={e}
                  onClick={() => onPick(e)}
                  style={{
                    width: 36, height: 36, border: 'none', background: 'transparent',
                    borderRadius: 8, cursor: 'pointer', fontSize: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
