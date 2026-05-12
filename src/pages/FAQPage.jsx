import React from 'react';
import ContentPage from '../components/ContentPage';

export default function FAQPage() {
  return (
    <ContentPage
      title="Frequently Asked Questions"
      seoTitle="FAQ"
      seoDescription="Answers to the most common questions about listing, claiming, closing, payments, fees, and disputes on MIDDLEMAN."
      intro="Quick answers to the most common questions. Can't find what you're looking for? Email support@middlemanmarketplace.com."
      sections={[
        // ── Getting started ────────────────────────────────────────
        {
          heading: 'Getting started',
          body: "Everything you need to know before your first listing or claim.",
        },
        {
          heading: 'What is MIDDLEMAN?',
          body: "MIDDLEMAN is a commission-based marketplace. Sellers list items, independent closers find buyers in exchange for a commission, and buyers get a curated experience with a real person on the other side of the deal. We handle payment infrastructure, escrow, and dispute mediation.",
        },
        {
          heading: 'Who can sign up?',
          body: "Anyone 18 or older. You can list items, claim listings as a closer, or both — every account can switch between Seller mode and Closer mode from the top-right menu.",
        },
        {
          heading: 'What\'s the difference between a closer and a seller?',
          body: [
            "The seller owns the item and wants to sell it. They set the listing price and the commission they're willing to pay.",
            "The closer is the broker for a single transaction. They claim a listing, find a buyer, negotiate the final price, and walk away with the commission when the deal completes. They don't take possession or front money — they just bring the buyer.",
          ],
        },
        {
          heading: 'How do I switch between Closer mode and Seller mode?',
          body: "Tap the avatar in the top-right corner and use the toggle. Each mode shows a different navigation (Home + Closings + Messages for closers; Dashboard + Post listing + Closings for sellers) so you stay focused.",
        },

        // ── For sellers ────────────────────────────────────────────
        {
          heading: 'Listing items (sellers)',
          body: "How to post and manage what you want sold.",
        },
        {
          heading: 'How do I post a listing?',
          body: "Switch to Seller mode, click \"Post listing,\" fill in the title, category, condition, price, location, and photos, and set the commission percentage you're offering closers. Hit Post Listing and you're live on the Home feed.",
        },
        {
          heading: 'What can I sell?',
          body: [
            "Anything legal and accurately described. We see high-value gear (watches, cameras, equipment), vehicles, collectibles, surplus inventory, and one-off items perform especially well — categories where finding the right buyer is hard.",
            "Prohibited: anything illegal, hazardous, regulated (firearms, controlled substances), counterfeit, or stolen. Listings violating our guidelines get removed and may result in account suspension.",
          ],
        },
        {
          heading: 'How do I set the commission percentage?',
          body: "Whatever you think will attract a closer who can actually move the item. Most listings land between 5% and 20%. Items that are harder to sell, more niche, or higher friction usually need higher commissions. Easy-to-move popular gear can succeed at 5-8%.",
        },
        {
          heading: 'Can I edit or delete a listing?',
          body: "Yes — from your Seller Dashboard, listings in the \"Available\" state have Edit and Delete buttons. Once a closer claims the listing or a closing is in flight, edits and deletes are locked to protect the deal in progress.",
        },

        // ── For closers ────────────────────────────────────────────
        {
          heading: 'Claiming and closing (closers)',
          body: "How to find and close deals as a closer.",
        },
        {
          heading: 'How do I claim a listing?',
          body: "Open any listing from the Home page and tap \"Claim This Listing.\" The listing locks to you for 7 days while you find a buyer.",
        },
        {
          heading: 'What does the 7-day window mean?',
          body: "When you claim a listing, no other closer can touch it for 7 days. You have that window to find a buyer and start a closing. If 7 days pass without progress, the listing returns to Available and any closer can claim it again.",
        },
        {
          heading: 'Can I extend my claim?',
          body: "Once. You can extend the window by 2 additional days if you're mid-negotiation with a buyer. Use the \"Negotiate (+2d)\" button on your active claim card.",
        },
        {
          heading: 'Can I release a claim I no longer want?',
          body: "Yes. From your Closer Dashboard, click \"Release claim\" on any active claim to return it to the marketplace. Doesn't affect your record. If a closing is already in flight on that listing, you'll need to cancel the closing first.",
        },
        {
          heading: 'How do I close a deal?',
          body: [
            "Once you have a buyer ready to pay, go to the Closings page and click \"Start Closing\" on the listing. Enter the buyer's name, email, and the final agreed price. MIDDLEMAN generates a secure Stripe payment link.",
            "Share the link with the buyer (Share Link opens your phone's native share sheet; Copy Link is fastest for chats). The buyer pays directly. Once payment lands, the deal moves to \"Paid\" status.",
            "Seller confirms the handoff. You hit \"Release Funds & Complete.\" The seller payout and your commission transfer to your Stripe accounts automatically.",
          ],
        },

        // ── Fees ───────────────────────────────────────────────────
        {
          heading: 'Fees and payments',
          body: "What it costs and where the money goes.",
        },
        {
          heading: 'What\'s the platform fee?',
          body: "Our platform fee slides with deal size — smaller deals pay 4%, high-ticket deals pay as low as 1%:",
          list: [
            "Under $1,000 — 4.0%",
            "$1,000 to $4,999 — 3.0%",
            "$5,000 to $19,999 — 2.0%",
            "$20,000 to $99,999 — 1.5%",
            "$100,000 and up — 1.0%",
          ],
        },
        {
          heading: 'How does the math work?',
          body: [
            "The platform fee comes off the agreed price first. Then the closer's commission (the percentage the seller set on the listing) comes off. Whatever's left is the seller's payout.",
            "Example: $10,000 deal at 10% closer commission. Platform fee: 2% × $10,000 = $200. Closer commission: 10% × $10,000 = $1,000. Seller payout: $10,000 − $200 − $1,000 = $8,800.",
          ],
        },
        {
          heading: 'Does Stripe charge a separate fee?',
          body: "Yes. Stripe charges a payment processing fee (~2.9% + 30¢ per transaction) deducted from the buyer's total before the splits above. We surface this in the live payout preview when you start a closing, so there are no surprises.",
        },
        {
          heading: 'What if the seller hasn\'t connected Stripe yet?',
          body: "Not a blocker. The buyer can still pay — funds sit in escrow with MIDDLEMAN until the seller completes their Stripe Connect onboarding. As soon as they do, the deferred transfer fires automatically. The same applies if the closer hasn't connected yet.",
        },

        // ── Payouts ────────────────────────────────────────────────
        {
          heading: 'When do I get paid?',
          body: "After the closing is marked complete (buyer paid + seller confirmed handoff + closer hit Release Funds), Stripe transfers your share to your connected payout account. Standard bank settlement is 1–3 business days for ACH; debit cards are typically same-day.",
        },
        {
          heading: 'How do I connect Stripe?',
          body: "Go to your Profile → Settings → Stripe Payout. Click Connect Stripe and follow Stripe's onboarding flow (they'll ask for ID and bank account info). Once approved, your account flips to \"Payouts enabled\" and the 🛡 Verified badge appears on your profile.",
        },

        // ── Trust & safety ─────────────────────────────────────────
        {
          heading: 'Reviews, trust, and safety',
          body: "How we keep the marketplace honest.",
        },
        {
          heading: 'How do reviews work?',
          body: [
            "After a deal completes, both parties — seller and closer — have 21 days to leave a review of each other. The review is hidden from the counterparty (and from public profiles) during the window until one of two things happens:",
            "1. Both parties submit. Both reviews publish at the same moment.",
            "2. 21 days pass. Whichever review exists publishes alone; the no-show party loses their chance to leave one.",
            "This is the Airbnb-style double-blind model. It prevents retaliatory reviews and gives the public profile signal that's actually honest.",
          ],
        },
        {
          heading: 'What happens if a deal goes wrong?',
          body: "Either party can flag a dispute from the Closings page using the \"Report problem\" button. The deal pauses, funds stay in escrow, and a support agent reviews evidence from both sides. Held funds release based on the resolution.",
        },
        {
          heading: 'How do I report a listing?',
          body: "Click the three-dot menu on any listing (or contact the trust & safety team at safety@middlemanmarketplace.com) and pick a reason. Admin reviews and removes listings that violate our guidelines, and the seller is notified by email with the reason.",
        },
        {
          heading: 'What about badges?',
          body: [
            "Badges appear on profiles when a user hits real milestones — they're computed from actual activity, not awarded manually. Examples: ✨ Profile Pro (100% complete profile), 🛡 Verified (Stripe payouts active), 💰 First Payout, 📋 5 Listings, 🏆 Top Closer (10+ completed deals), ⚡ Fast Responder (median chat reply under 1 hour), 🔥 5+ Streak, 💎 High-Value Deals.",
            "You see the full badge list on your profile — earned ones are colored, unearned ones are greyed out with a tooltip explaining how to earn them.",
          ],
        },

        // ── Account ────────────────────────────────────────────────
        {
          heading: 'Account questions',
          body: "Managing your MIDDLEMAN account.",
        },
        {
          heading: 'Can I change my email address?',
          body: "Email is tied to your login and can't be changed from the Settings panel. Contact support@middlemanmarketplace.com if you need it updated.",
        },
        {
          heading: 'How do I delete my account?',
          body: "Profile → Settings → Danger Zone → Delete my account. You'll be asked to type DELETE to confirm. This permanently removes your profile, listings, messages, and watchlist. Past completed deals stay in the audit log (required for tax and dispute records) but are anonymized.",
        },
        {
          heading: 'What if I have an active closing when I try to delete?',
          body: "Account deletion is blocked while you have any non-final closings. Resolve them first (complete, refund, or dispute resolution) and then try again.",
        },
      ]}
      footer="Still stuck? Email support@middlemanmarketplace.com — we read everything and usually reply within 24 hours."
    />
  );
}
