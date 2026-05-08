import React from 'react';
import ContentPage from '../components/ContentPage';

export default function AboutPage() {
  return (
    <ContentPage
      title="About MIDDLEMAN"
      intro="MIDDLEMAN is a commission-driven marketplace where independent closers help sellers move high-value inventory and earn a percentage of every closed deal."
      sections={[
        {
          heading: 'How it works',
          body: 'Sellers list items they want to sell. Closers browse open listings, claim the ones they can move, find a buyer, and close the deal. When the deal completes, the closer earns the listed commission and the seller receives the agreed payout.',
        },
        {
          heading: 'Two views, one platform',
          body: 'Every account can switch between Closer view and Seller view from the top-right menu. Each view shows only the surfaces relevant to that role, so the experience stays focused regardless of which side of a deal you are on.',
        },
        {
          heading: 'Trust and safety',
          body: 'Funds for completed deals are processed through a payment provider with built-in escrow and dispute handling. Closers are reviewed by sellers after each completed transaction; reviews and ratings are visible on every closer profile.',
        },
        {
          heading: 'Contact',
          body: 'For partnership, press, or general inquiries, reach us at hello@middleman.example.',
        },
      ]}
    />
  );
}
