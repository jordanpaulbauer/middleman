import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Zap, ShoppingBag, Users, ShieldCheck, Sparkles,
  Tag, HandCoins, Handshake, MessageCircle, Lock, Star,
} from 'lucide-react';
import Seo from '../components/Seo';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--bg)' }}>
      <Seo
        title="About MIDDLEMAN"
        description="MIDDLEMAN is a commission-driven marketplace where sellers list high-value items and independent closers find buyers for a percentage of the deal."
      />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(180deg, var(--rausch-light) 0%, transparent 100%)',
        padding: '80px 24px 60px',
      }}>
        <div style={{ maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-light)',
            color: 'var(--rausch)', padding: '6px 12px', borderRadius: 999,
            fontSize: 13, fontWeight: 500, marginBottom: 24, letterSpacing: '-0.012em',
          }}>
            <Sparkles size={14} /> The commission marketplace
          </div>
          <h1 style={{
            fontSize: 56, fontWeight: 500, letterSpacing: '-1.5px',
            lineHeight: 1.05, margin: 0, color: 'var(--text)',
          }}>
            The marketplace where{' '}
            <span style={{ color: 'var(--rausch)' }}>someone else</span>{' '}
            does the selling.
          </h1>
          <p style={{
            fontSize: 18, lineHeight: 1.55, color: 'var(--text-secondary)',
            maxWidth: 640, margin: '24px auto 0',
          }}>
            List what you have. Independent closers find the buyer, broker the deal,
            and earn a commission only when it closes. Lower fees on bigger deals.
            Real humans, real escrow, real reviews.
          </p>
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center',
            marginTop: 36, flexWrap: 'wrap',
          }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/browse')}
              style={{ minWidth: 180 }}
            >
              Browse listings <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/post')}
              style={{ minWidth: 180 }}
            >
              Post a listing
            </button>
          </div>
        </div>
      </section>

      {/* ── Three pillars: who it's for ──────────────────────────── */}
      <section style={{ padding: '64px 24px', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <SectionHeading
            eyebrow="Who it's for"
            title="Three roles, one platform"
            subtitle="MIDDLEMAN connects three people who'd otherwise never find each other."
          />
          <div style={{
            display: 'grid', gap: 20, marginTop: 40,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}>
            <Pillar
              icon={<ShoppingBag size={22} />}
              title="Sellers"
              body="You've got the inventory — a vintage watch, surplus equipment, a one-off build. You don't have the time, the buyer list, or the patience to sell it yourself. List it, set a commission, and let closers come to you."
            />
            <Pillar
              icon={<Zap size={22} />}
              title="Closers"
              body="You have the network, the eye, and the hustle. Claim a listing, find a buyer through your channels, broker the deal. You walk away with a percentage on every closing — no inventory risk, no upfront cost."
            />
            <Pillar
              icon={<Users size={22} />}
              title="Buyers"
              body="Get a curated stream of inventory presented by someone who actually wants the sale to happen. Payment runs through Stripe escrow until the seller confirms handoff, so you're protected end to end."
            />
          </div>
        </div>
      </section>

      {/* ── How a deal works ─────────────────────────────────────── */}
      <section style={{ padding: '72px 24px', background: 'var(--bg-subtle)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <SectionHeading
            eyebrow="How it works"
            title="A deal, start to finish"
            subtitle="From listing to payout in six clear steps."
          />
          <div style={{
            display: 'grid', gap: 20, marginTop: 44,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}>
            <Step n={1} icon={<Tag size={18} />} title="Seller lists" body="An item with a price and the commission they're offering closers." />
            <Step n={2} icon={<Zap size={18} />} title="Closer claims" body="Locks the listing for 7 days while they find a buyer." />
            <Step n={3} icon={<MessageCircle size={18} />} title="Closer brings a buyer" body="Negotiates the final price and starts a closing in the dashboard." />
            <Step n={4} icon={<Lock size={18} />} title="Buyer pays" body="Through a secure Stripe link. Funds sit in escrow with MIDDLEMAN." />
            <Step n={5} icon={<Handshake size={18} />} title="Seller confirms handoff" body="Item changed hands. Closing flips to ready-to-release." />
            <Step n={6} icon={<HandCoins size={18} />} title="Funds release" body="Seller payout + closer commission transfer automatically." />
          </div>
        </div>
      </section>

      {/* ── Trust & safety ───────────────────────────────────────── */}
      <section style={{ padding: '72px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <SectionHeading
            eyebrow="Trust & safety"
            title="Built so nobody gets burned"
            subtitle="Money never moves directly between parties. Reputation rides on every deal."
          />
          <div style={{
            display: 'grid', gap: 16, marginTop: 40,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}>
            <Trust
              icon={<Lock size={20} color="var(--blue)" />}
              title="Stripe escrow on every closing"
              body="Funds are held by MIDDLEMAN until both parties confirm. Disputes route to a real person for review."
            />
            <Trust
              icon={<Star size={20} color="var(--yellow)" />}
              title="Double-blind reviews"
              body="Seller and closer review each other after every deal. Neither sees the other's review until both submit, or 21 days pass."
            />
            <Trust
              icon={<ShieldCheck size={20} color="var(--green)" />}
              title="Earned badges, not bought"
              body="Every badge on a profile — Top Closer, Fast Responder, High-Value Deals — is computed from real activity. Nothing decorative."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing / tier table ─────────────────────────────────── */}
      <section style={{
        padding: '72px 24px', background: 'var(--text)', color: 'white',
      }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <SectionHeading
            eyebrow="Pricing"
            title="Fees that get out of the way on bigger deals"
            subtitle="Our platform fee slides with deal size — so we don't punish high-ticket sales."
            inverted
          />
          <div style={{
            marginTop: 44, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
            overflow: 'hidden',
          }}>
            {FEE_ROWS.map((row, i) => (
              <div key={row.range} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 24px',
                borderBottom: i < FEE_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>{row.range}</span>
                <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--rausch)' }}>{row.fee}</span>
              </div>
            ))}
          </div>
          <p style={{
            fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 16,
            textAlign: 'center', lineHeight: 1.5,
          }}>
            Sellers set the closer commission separately (typically 5–20%).{' '}
            Stripe processing fees (~2.9% + 30¢) apply on top.
          </p>
        </div>
      </section>

      {/* ── Differentiation ──────────────────────────────────────── */}
      <section style={{ padding: '72px 24px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <SectionHeading
            eyebrow="What makes us different"
            title="Why this isn't just another listing site"
          />
          <div style={{ marginTop: 36, display: 'grid', gap: 16 }}>
            <Compare
              title="vs. eBay / Facebook Marketplace"
              body="They assume the seller is also the salesperson. For high-value items, that's rarely true — listings get neglected, messages go unanswered, lowballers pile up. On MIDDLEMAN, a closer's reputation rides on closing the deal."
            />
            <Compare
              title="vs. Craigslist"
              body="Craigslist assumes everyone shows up in good faith. They don't. MIDDLEMAN runs money through Stripe escrow with mutual reviews so trust isn't optional."
            />
            <Compare
              title="vs. Consignment shops"
              body="Consignment takes 30–50% and limits you to whatever's in their physical store. Our platform fee tops out at 4% (dropping to 1% on six-figure deals) and the inventory lives wherever you keep it."
            />
            <Compare
              title="vs. Auction houses"
              body="Auction houses charge a 10–25% seller commission plus a 12–25% buyer's premium — same idea as MIDDLEMAN, but 5–10× the cost, and only if they accept your item to begin with."
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, transparent 0%, var(--rausch-light) 100%)',
        borderTop: '1px solid var(--border-light)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 36, fontWeight: 500, letterSpacing: '-0.8px',
            lineHeight: 1.15, margin: 0,
          }}>
            Ready to put something on the market?
          </h2>
          <p style={{
            fontSize: 16, color: 'var(--text-secondary)', marginTop: 14,
            maxWidth: 540, marginLeft: 'auto', marginRight: 'auto',
          }}>
            List in a couple of minutes, or browse what closers are working on right now.
          </p>
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center',
            marginTop: 32, flexWrap: 'wrap',
          }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/post')}
              style={{ minWidth: 200 }}
            >
              Post a listing <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/browse')}
              style={{ minWidth: 200 }}
            >
              Browse the marketplace
            </button>
          </div>
          <p style={{
            fontSize: 13, color: 'var(--text-muted)', marginTop: 36, lineHeight: 1.6,
          }}>
            Questions? <a href="mailto:hello@middlemanmarketplace.com" style={{ color: 'var(--text)', textDecoration: 'underline' }}>hello@middlemanmarketplace.com</a>
            {'  ·  '}
            Trust & safety: <a href="mailto:safety@middlemanmarketplace.com" style={{ color: 'var(--text)', textDecoration: 'underline' }}>safety@middlemanmarketplace.com</a>
          </p>
        </div>
      </section>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────

function SectionHeading({ eyebrow, title, subtitle, inverted }) {
  const mutedColor = inverted ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)';
  const rauschColor = inverted ? 'var(--rausch)' : 'var(--rausch)';
  const titleColor = inverted ? 'white' : 'var(--text)';
  return (
    <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
      {eyebrow && (
        <div style={{
          fontSize: 13, fontWeight: 500, color: rauschColor,
          letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12,
        }}>
          {eyebrow}
        </div>
      )}
      <h2 style={{
        fontSize: 32, fontWeight: 500, letterSpacing: '-0.6px',
        lineHeight: 1.15, margin: 0, color: titleColor,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          fontSize: 16, color: mutedColor, marginTop: 14,
          lineHeight: 1.55,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Pillar({ icon, title, body }) {
  return (
    <div style={{
      padding: 28, background: 'var(--bg)', borderRadius: 16,
      border: '1px solid var(--border-light)',
      transition: 'transform 200ms, box-shadow 200ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'var(--rausch-light)', color: 'var(--rausch)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8, letterSpacing: '-0.012em' }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

function Step({ n, icon, title, body }) {
  return (
    <div style={{
      padding: 22, background: 'var(--bg)', borderRadius: 14,
      border: '1px solid var(--border-light)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--text)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 500,
        }}>{n}</div>
        <div style={{ color: 'var(--text-muted)' }}>{icon}</div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, letterSpacing: '-0.012em' }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

function Trust({ icon, title, body }) {
  return (
    <div style={{
      padding: 22, background: 'var(--bg)', borderRadius: 14,
      border: '1px solid var(--border-light)',
    }}>
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, letterSpacing: '-0.012em' }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

function Compare({ title, body }) {
  return (
    <div style={{
      padding: '20px 22px', background: 'var(--bg-subtle)', borderRadius: 12,
      border: '1px solid var(--border-light)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--rausch)', marginBottom: 6, letterSpacing: '-0.012em' }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

const FEE_ROWS = [
  { range: 'Under $1,000', fee: '4.0%' },
  { range: '$1,000 — $4,999', fee: '3.0%' },
  { range: '$5,000 — $19,999', fee: '2.0%' },
  { range: '$20,000 — $99,999', fee: '1.5%' },
  { range: '$100,000 and up', fee: '1.0%' },
];
