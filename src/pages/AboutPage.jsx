import React from 'react';
import ContentPage from '../components/ContentPage';

export default function AboutPage() {
  return (
    <ContentPage
      title="About MIDDLEMAN"
      seoDescription="MIDDLEMAN is a commission-driven marketplace where sellers list high-value items and independent closers find buyers in exchange for a percentage of the deal."
      intro={
        "MIDDLEMAN is a commission marketplace for the things that don't sell themselves. " +
        "Sellers list items; independent closers — people with the network, the eye, and the time to find a buyer — claim them, broker the deal, and earn a percentage of the sale. " +
        "Buyers get curated inventory and a human in the middle, not a faceless listing."
      }
      sections={[
        // ── The problem ────────────────────────────────────────────
        {
          heading: 'Why MIDDLEMAN exists',
          body: [
            "Most marketplaces assume the seller has the time, the photos, the patience, and the audience to sell their own stuff. For high-value gear, niche inventory, or anything illiquid, that's rarely true. A vintage Rolex, a commercial mixer, a 2,000lb pallet of overstock — these don't sell themselves with a Craigslist post.",
            "On the other side, plenty of people are great at moving inventory: dealers, brokers, hobbyists with deep networks, salespeople between gigs. They have the skill but not the inventory.",
            "MIDDLEMAN connects the two. Sellers list what they have. Closers pick what they can move. Everyone wins when the deal closes — and nobody loses anything when it doesn't.",
          ],
        },

        // ── The closer role ────────────────────────────────────────
        {
          heading: 'The closer — a role most marketplaces don\'t have',
          body: [
            "A \"closer\" is the broker for a single transaction. They don't take possession of the item, don't hold inventory, don't front any money. They claim a listing, find a buyer through their own channels, negotiate the price, and walk away with a percentage when the deal completes.",
            "The seller sets the commission percentage when they list — typically 5-20% depending on the item and how hard they expect it to be to move. The closer either accepts the terms by claiming, or skips it. Pure free market.",
          ],
        },

        // ── How a deal actually works ───────────────────────────────
        {
          heading: 'How a deal works, step by step',
          list: [
            "Seller lists an item with a price and the commission they\'re offering.",
            "Closer claims the listing. They have 7 days (extendable by 2 once) to find a buyer.",
            "Closer brings a buyer, negotiates the final price, and starts a \"closing\" with the buyer\'s details.",
            "MIDDLEMAN generates a secure Stripe payment link. The buyer pays through that link.",
            "Funds sit in escrow with MIDDLEMAN until the seller confirms the item changed hands.",
            "Seller confirms handoff. Closer marks the deal complete. Stripe transfers the seller payout and the closer commission. The platform takes a sliding fee (4% on small deals, dropping to 1% on $100k+ deals).",
          ],
        },

        // ── Who it's for ────────────────────────────────────────────
        {
          heading: 'Who lists on MIDDLEMAN',
          body: [
            "Anyone with something to sell that they don\'t want to handle the sale of themselves. Sellers we see succeed:",
          ],
          list: [
            "Estate liquidators with collections too varied to specialize in",
            "Small businesses unwinding equipment or surplus inventory",
            "Collectors offloading high-end items where the buyer pool is small but real",
            "Builders, fabricators, makers with one-off or end-of-batch product",
            "Anyone who'd rather pay a commission than spend a month answering low-ball Craigslist messages",
          ],
        },
        {
          heading: 'Who closes on MIDDLEMAN',
          body: [
            "Anyone with a network, a phone, and the hustle to move a deal across the finish line:",
          ],
          list: [
            "Independent brokers and dealers who already trade in a category",
            "Salespeople between jobs or building a side income",
            "Industry veterans monetizing 20 years of contacts",
            "Hobbyists deep enough in a niche to know exactly who would want a particular item",
          ],
        },

        // ── Buyer side ─────────────────────────────────────────────
        {
          heading: 'How buyers benefit',
          body: [
            "Buyers get a curated stream of inventory presented by someone who actually wants the deal to close. The closer's reputation rides on the transaction, so the information you get tends to be accurate, the negotiation tends to be reasonable, and the handoff tends to happen.",
            "Payment runs through Stripe in escrow — buyers don't release funds until the seller confirms the item is on its way, and disputes get reviewed by a real person.",
          ],
        },

        // ── Trust & safety ─────────────────────────────────────────
        {
          heading: 'Trust and safety',
          body: [
            "Money never moves directly between buyer, seller, and closer. Every transaction runs through Stripe Connect with funds held by MIDDLEMAN until both parties confirm the handoff. If anything goes sideways, either party can open a dispute from the Closings page and our team reviews.",
            "After every completed deal, the seller and closer review each other in a 21-day double-blind window — neither side can read the other's review until both have submitted, or until the window expires. This prevents retaliatory reviews and gives both sides honest signal.",
            "Closers earn badges as they build a track record (verified payouts, completed deals, fast response time, high-value closes). Every badge on a profile is earned from actual activity — none of it is decorative.",
          ],
        },

        // ── Pricing ────────────────────────────────────────────────
        {
          heading: 'What it costs',
          body: [
            "Sellers set the closer commission when they list (usually 5-20%). That comes out of the sale price and goes to the closer when the deal completes.",
            "MIDDLEMAN's platform fee slides with deal size so we don't punish high-ticket transactions:",
          ],
          list: [
            "Under $1,000 — 4.0%",
            "$1,000 to $4,999 — 3.0%",
            "$5,000 to $19,999 — 2.0%",
            "$20,000 to $99,999 — 1.5%",
            "$100,000 and up — 1.0%",
          ],
        },

        // ── Differentiation ────────────────────────────────────────
        {
          heading: 'How we differ from eBay, Craigslist, and consignment',
          body: [
            "eBay and Facebook Marketplace assume the seller is also the closer. Most sellers aren't, especially for items over $1,000. You end up with neglected listings, missed messages, and lowballers.",
            "Craigslist assumes everyone shows up in good faith. They don't.",
            "Consignment shops take 30-50% and limit you to what's in their physical store. MIDDLEMAN's fee tops out at 4% (and drops as deals get bigger), and the inventory is wherever the seller has it.",
            "The closer is the difference. You're paying a percentage to a human who actually wants the deal to close, not paying a listing fee to a platform that doesn't care either way.",
          ],
        },

        // ── Contact ────────────────────────────────────────────────
        {
          heading: 'Get in touch',
          body: [
            "Partnership, press, support questions — email hello@middlemanmarketplace.com.",
            "For trust & safety issues (suspicious listings, dispute concerns, account problems), use the report button on the listing or email support@middlemanmarketplace.com directly.",
          ],
        },
      ]}
      footer="MIDDLEMAN is a commission marketplace — we facilitate transactions, we don't take title to inventory. All deals are between buyer, seller, and closer; we handle payment infrastructure, dispute mediation, and trust signals."
    />
  );
}
