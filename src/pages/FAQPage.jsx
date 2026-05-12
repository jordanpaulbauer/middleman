import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Search, Mail, ArrowRight } from 'lucide-react';
import Seo from '../components/Seo';

export default function FAQPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const sectionRefs = useRef({});

  const filteredCategories = CATEGORIES
    .map(cat => ({
      ...cat,
      items: cat.items.filter(q =>
        !query.trim() ||
        q.q.toLowerCase().includes(query.toLowerCase()) ||
        (typeof q.a === 'string' && q.a.toLowerCase().includes(query.toLowerCase())) ||
        (Array.isArray(q.a) && q.a.some(p => p.toLowerCase().includes(query.toLowerCase())))
      ),
    }))
    .filter(cat => cat.items.length > 0);

  const scrollToCategory = (id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ background: 'var(--bg)' }}>
      <Seo title="FAQ" description="Answers to the most common questions about MIDDLEMAN — listing, claiming, closing, payments, fees, and disputes." />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(180deg, var(--rausch-light) 0%, transparent 100%)',
        padding: '64px 24px 48px',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-light)',
            color: 'var(--rausch)', padding: '6px 12px', borderRadius: 999,
            fontSize: 13, fontWeight: 500, marginBottom: 20, letterSpacing: '-0.012em',
          }}>
            Frequently Asked Questions
          </div>
          <h1 style={{
            fontSize: 44, fontWeight: 500, letterSpacing: '-1px',
            lineHeight: 1.1, margin: 0,
          }}>
            How can we help?
          </h1>
          <p style={{
            fontSize: 16, color: 'var(--text-secondary)', marginTop: 14,
            lineHeight: 1.55,
          }}>
            Quick answers to the most common questions about listing, claiming,
            closing, and getting paid.
          </p>

          {/* Search */}
          <div style={{
            marginTop: 28, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto',
            position: 'relative',
          }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-muted)' }}
            />
            <input
              className="input"
              placeholder="Search questions..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                paddingLeft: 42, height: 44, borderRadius: 999,
                boxShadow: 'var(--shadow-sm)',
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Category pills ────────────────────────────────────────── */}
      {!query.trim() && (
        <section style={{
          padding: '0 24px',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{
            maxWidth: 1000, margin: '0 auto',
            display: 'flex', gap: 8, overflowX: 'auto',
            padding: '14px 0',
          }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className="pill"
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Q&A sections ──────────────────────────────────────────── */}
      <section style={{ padding: '40px 24px 64px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {filteredCategories.length === 0 && (
            <div style={{
              padding: 60, textAlign: 'center', color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: 'var(--text)' }}>
                No matches
              </div>
              <div style={{ fontSize: 14 }}>
                Try different keywords, or email{' '}
                <a href="mailto:support@middlemanmarketplace.com" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
                  support@middlemanmarketplace.com
                </a>
              </div>
            </div>
          )}

          {filteredCategories.map(cat => (
            <div
              key={cat.id}
              ref={el => { sectionRefs.current[cat.id] = el; }}
              style={{ marginBottom: 40, scrollMarginTop: 80 }}
            >
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'var(--rausch)',
                letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6,
              }}>
                {cat.eyebrow || cat.label}
              </div>
              <h2 style={{
                fontSize: 24, fontWeight: 500, letterSpacing: '-0.4px',
                margin: '0 0 18px',
              }}>
                {cat.label}
              </h2>

              <div style={{
                background: 'var(--bg)', borderRadius: 12,
                border: '1px solid var(--border-light)', overflow: 'hidden',
              }}>
                {cat.items.map((item, i) => {
                  const id = `${cat.id}-${i}`;
                  const open = openId === id;
                  return (
                    <FaqItem
                      key={id}
                      open={open}
                      onToggle={() => setOpenId(open ? null : id)}
                      isLast={i === cat.items.length - 1}
                      question={item.q}
                      answer={item.a}
                      list={item.list}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Still stuck CTA ───────────────────────────────────────── */}
      <section style={{
        padding: '60px 24px',
        background: 'linear-gradient(180deg, transparent 0%, var(--rausch-light) 100%)',
        borderTop: '1px solid var(--border-light)',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', width: 48, height: 48, borderRadius: '50%',
            background: 'var(--bg)', border: '1px solid var(--border-light)',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--rausch)', marginBottom: 16,
          }}>
            <Mail size={20} />
          </div>
          <h2 style={{
            fontSize: 28, fontWeight: 500, letterSpacing: '-0.5px',
            margin: 0, lineHeight: 1.2,
          }}>
            Still stuck?
          </h2>
          <p style={{
            fontSize: 15, color: 'var(--text-secondary)', marginTop: 10,
            lineHeight: 1.55,
          }}>
            Email{' '}
            <a href="mailto:support@middlemanmarketplace.com" style={{ color: 'var(--text)', textDecoration: 'underline', fontWeight: 500 }}>
              support@middlemanmarketplace.com
            </a>
            {' '}— we read everything and usually reply within 24 hours.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/about')}>
              Learn more <ArrowRight size={14} />
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/browse')}>
              Browse listings
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Single accordion item ────────────────────────────────────────
function FaqItem({ question, answer, list, open, onToggle, isLast }) {
  const contentRef = useRef(null);
  return (
    <div style={{
      borderBottom: isLast ? 'none' : '1px solid var(--border-light)',
    }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, padding: '18px 22px', background: open ? 'var(--bg-subtle)' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{
          fontSize: 15, fontWeight: 500, color: 'var(--text)',
          letterSpacing: '-0.012em', lineHeight: 1.4,
        }}>
          {question}
        </span>
        <ChevronDown
          size={18}
          color="var(--text-muted)"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms',
          }}
        />
      </button>
      <div
        ref={contentRef}
        style={{
          maxHeight: open ? (contentRef.current?.scrollHeight + 100) + 'px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 250ms ease',
          background: 'var(--bg-subtle)',
        }}
      >
        <div style={{ padding: '0 22px 18px' }}>
          {Array.isArray(answer)
            ? answer.map((p, i) => (
              <p key={i} style={answerStyle}>{p}</p>
            ))
            : <p style={answerStyle}>{answer}</p>
          }
          {list && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 22 }}>
              {list.map((li, i) => (
                <li key={i} style={{ ...answerStyle, marginBottom: 6 }}>{li}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const answerStyle = {
  fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65,
  margin: '0 0 10px',
};

// ── Content ──────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'getting-started',
    label: 'Getting started',
    items: [
      {
        q: 'What is MIDDLEMAN?',
        a: 'MIDDLEMAN is a commission-based marketplace. Sellers list items, independent closers find buyers in exchange for a commission, and buyers get a curated experience with a real person on the other side of the deal. We handle payment infrastructure, escrow, and dispute mediation.',
      },
      {
        q: 'Who can sign up?',
        a: 'Anyone 18 or older. You can list items, claim listings as a closer, or both — every account can switch between Seller mode and Closer mode from the top-right menu.',
      },
      {
        q: "What's the difference between a closer and a seller?",
        a: [
          'The seller owns the item and wants to sell it. They set the listing price and the commission they\'re willing to pay.',
          'The closer is the broker for a single transaction. They claim a listing, find a buyer, negotiate the final price, and walk away with the commission when the deal completes. They don\'t take possession or front money — they just bring the buyer.',
        ],
      },
      {
        q: 'How do I switch between Closer mode and Seller mode?',
        a: 'Tap the avatar in the top-right corner and use the toggle. Each mode shows a different navigation (Home + Closings + Messages for closers; Dashboard + Post listing + Closings for sellers) so you stay focused.',
      },
    ],
  },
  {
    id: 'sellers',
    label: 'Listing items',
    eyebrow: 'For sellers',
    items: [
      {
        q: 'How do I post a listing?',
        a: 'Switch to Seller mode, click "Post listing," fill in the title, category, condition, price, location, and photos, and set the commission percentage you\'re offering closers. Hit Post Listing and you\'re live on the Home feed.',
      },
      {
        q: 'What can I sell?',
        a: [
          'Anything legal and accurately described. We see high-value gear (watches, cameras, equipment), vehicles, collectibles, surplus inventory, and one-off items perform especially well — categories where finding the right buyer is hard.',
          'Prohibited: anything illegal, hazardous, regulated (firearms, controlled substances), counterfeit, or stolen. Listings violating our guidelines get removed and may result in account suspension.',
        ],
      },
      {
        q: 'How do I set the commission percentage?',
        a: 'Whatever you think will attract a closer who can actually move the item. Most listings land between 5% and 20%. Items that are harder to sell, more niche, or higher friction usually need higher commissions. Easy-to-move popular gear can succeed at 5-8%.',
      },
      {
        q: 'Can I edit or delete a listing?',
        a: 'Yes — from your Seller Dashboard, listings in the "Available" state have Edit and Delete buttons. Once a closer claims the listing or a closing is in flight, edits and deletes are locked to protect the deal in progress.',
      },
    ],
  },
  {
    id: 'closers',
    label: 'Claiming & closing',
    eyebrow: 'For closers',
    items: [
      {
        q: 'How do I claim a listing?',
        a: 'Open any listing from the Home page and tap "Claim This Listing." The listing locks to you for 7 days while you find a buyer.',
      },
      {
        q: 'What does the 7-day window mean?',
        a: 'When you claim a listing, no other closer can touch it for 7 days. You have that window to find a buyer and start a closing. If 7 days pass without progress, the listing returns to Available and any closer can claim it again.',
      },
      {
        q: 'Can I extend my claim?',
        a: 'Once. You can extend the window by 2 additional days if you\'re mid-negotiation with a buyer. Use the "Negotiate (+2d)" button on your active claim card.',
      },
      {
        q: 'Can I release a claim I no longer want?',
        a: 'Yes. From your Closer Dashboard, click "Release claim" on any active claim to return it to the marketplace. Doesn\'t affect your record. If a closing is already in flight on that listing, you\'ll need to cancel the closing first.',
      },
      {
        q: 'How do I close a deal?',
        a: [
          'Once you have a buyer ready to pay, go to the Closings page and click "Start Closing" on the listing. Enter the buyer\'s name, email, and the final agreed price. MIDDLEMAN generates a secure Stripe payment link.',
          'Share the link with the buyer (Share Link opens your phone\'s native share sheet; Copy Link is fastest for chats). The buyer pays directly. Once payment lands, the deal moves to "Paid" status.',
          'Seller confirms the handoff. You hit "Release Funds & Complete." The seller payout and your commission transfer to your Stripe accounts automatically.',
        ],
      },
    ],
  },
  {
    id: 'fees',
    label: 'Fees & payments',
    items: [
      {
        q: "What's the platform fee?",
        a: 'Our platform fee slides with deal size — smaller deals pay 4%, high-ticket deals pay as low as 1%:',
        list: [
          'Under $1,000 — 4.0%',
          '$1,000 to $4,999 — 3.0%',
          '$5,000 to $19,999 — 2.0%',
          '$20,000 to $99,999 — 1.5%',
          '$100,000 and up — 1.0%',
        ],
      },
      {
        q: 'How does the math work?',
        a: [
          'The platform fee comes off the agreed price first. Then the closer\'s commission (the percentage the seller set on the listing) comes off. Whatever\'s left is the seller\'s payout.',
          'Example: $10,000 deal at 10% closer commission. Platform fee: 2% × $10,000 = $200. Closer commission: 10% × $10,000 = $1,000. Seller payout: $10,000 − $200 − $1,000 = $8,800.',
        ],
      },
      {
        q: 'Does Stripe charge a separate fee?',
        a: "Yes. Stripe charges a payment processing fee (~2.9% + 30¢ per transaction) deducted from the buyer's total before the splits above. We surface this in the live payout preview when you start a closing, so there are no surprises.",
      },
      {
        q: "What if the seller hasn't connected Stripe yet?",
        a: "Not a blocker. The buyer can still pay — funds sit in escrow with MIDDLEMAN until the seller completes their Stripe Connect onboarding. As soon as they do, the deferred transfer fires automatically. The same applies if the closer hasn't connected yet.",
      },
      {
        q: 'When do I get paid?',
        a: 'After the closing is marked complete (buyer paid + seller confirmed handoff + closer hit Release Funds), Stripe transfers your share to your connected payout account. Standard bank settlement is 1–3 business days for ACH; debit cards are typically same-day.',
      },
      {
        q: 'How do I connect Stripe?',
        a: 'Go to your Profile → Settings → Stripe Payout. Click Connect Stripe and follow Stripe\'s onboarding flow (they\'ll ask for ID and bank account info). Once approved, your account flips to "Payouts enabled" and the 🛡 Verified badge appears on your profile.',
      },
    ],
  },
  {
    id: 'trust',
    label: 'Reviews & safety',
    eyebrow: 'Trust',
    items: [
      {
        q: 'How do reviews work?',
        a: [
          'After a deal completes, both parties — seller and closer — have 21 days to leave a review of each other. The review is hidden from the counterparty (and from public profiles) during the window until one of two things happens:',
          '1. Both parties submit. Both reviews publish at the same moment.',
          '2. 21 days pass. Whichever review exists publishes alone; the no-show party loses their chance to leave one.',
          'This is the Airbnb-style double-blind model. It prevents retaliatory reviews and gives the public profile signal that\'s actually honest.',
        ],
      },
      {
        q: 'What happens if a deal goes wrong?',
        a: 'Either party can flag a dispute from the Closings page using the "Report problem" button. The deal pauses, funds stay in escrow, and a support agent reviews evidence from both sides. Held funds release based on the resolution.',
      },
      {
        q: 'How do I report a listing?',
        a: 'Click the three-dot menu on any listing (or contact the trust & safety team at safety@middlemanmarketplace.com) and pick a reason. Admin reviews and removes listings that violate our guidelines, and the seller is notified by email with the reason.',
      },
      {
        q: 'What about badges?',
        a: [
          'Badges appear on profiles when a user hits real milestones — they\'re computed from actual activity, not awarded manually. Examples: ✨ Profile Pro (100% complete profile), 🛡 Verified (Stripe payouts active), 💰 First Payout, 📋 5 Listings, 🏆 Top Closer (10+ completed deals), ⚡ Fast Responder (median chat reply under 1 hour), 🔥 5+ Streak, 💎 High-Value Deals.',
          'You see the full badge list on your profile — earned ones are colored, unearned ones are greyed out with a tooltip explaining how to earn them.',
        ],
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        q: 'Can I change my email address?',
        a: "Email is tied to your login and can't be changed from the Settings panel. Contact support@middlemanmarketplace.com if you need it updated.",
      },
      {
        q: 'How do I delete my account?',
        a: 'Profile → Settings → Danger Zone → Delete my account. You\'ll be asked to type DELETE to confirm. This permanently removes your profile, listings, messages, and watchlist. Past completed deals stay in the audit log (required for tax and dispute records) but are anonymized.',
      },
      {
        q: 'What if I have an active closing when I try to delete?',
        a: 'Account deletion is blocked while you have any non-final closings. Resolve them first (complete, refund, or dispute resolution) and then try again.',
      },
    ],
  },
];
