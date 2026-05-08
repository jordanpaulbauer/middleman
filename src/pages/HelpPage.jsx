import React from 'react';
import ContentPage from '../components/ContentPage';

export default function HelpPage() {
  return (
    <ContentPage
      title="Help"
      intro="Quick answers to the most common questions. If you don't see your answer here, email support@middleman.example."
      sections={[
        {
          heading: 'How do I claim a listing?',
          body: 'Open the listing from the Browse page and tap "Claim". You have a 7-day window to find a buyer and close the deal. You can extend by 2 days once if a buyer is mid-negotiation.',
        },
        {
          heading: 'When do I get paid?',
          body: 'Closers are paid out after the buyer confirms receipt of the item and the closing is marked complete. Payouts settle to your connected payout account within 1–3 business days.',
        },
        {
          heading: 'What happens if a deal falls through?',
          body: 'If the buyer cannot complete the purchase, the listing returns to "available" and another closer can claim it. No fees are charged for incomplete deals.',
        },
        {
          heading: 'How do disputes work?',
          body: 'Either party can flag a transaction as disputed from the Closings page. A support agent reviews the evidence on both sides, and held funds are released according to the resolution.',
        },
        {
          heading: 'Reporting a listing',
          body: 'If a listing looks fraudulent or violates our acceptable use policy, email report@middleman.example with the listing URL and a short description.',
        },
      ]}
    />
  );
}
