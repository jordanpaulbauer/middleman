import React from 'react';
import ContentPage from '../components/ContentPage';

export default function CookiesPage() {
  return (
    <ContentPage
      title="Cookie Policy"
      lastUpdated="May 7, 2026"
      intro="MIDDLEMAN uses cookies and similar storage technologies to keep you signed in, remember your preferences, and understand how the product is used."
      sections={[
        {
          heading: 'What we use',
          list: [
            'Essential — keeps you signed in and remembers your selected view (Closer or Seller). Required for the product to function.',
            'Preferences — stores small UI preferences such as recently used filters and conversation selections.',
            'Analytics — anonymized usage data that helps us understand which features are working and where users get stuck.',
          ],
        },
        {
          heading: 'Your choices',
          body: 'You can clear cookies at any time from your browser settings. Disabling essential cookies will sign you out and prevent the marketplace from functioning.',
        },
        {
          heading: 'Third parties',
          body: 'When required by a feature, we rely on a small number of trusted vendors (e.g., payments). These vendors may set their own cookies, governed by their own policies.',
        },
      ]}
      footer="This policy is a sample. Replace with your reviewed cookie disclosures before launch."
    />
  );
}
