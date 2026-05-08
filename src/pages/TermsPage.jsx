import React from 'react';
import ContentPage from '../components/ContentPage';

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of Service"
      lastUpdated="May 7, 2026"
      intro="By accessing or using MIDDLEMAN, you agree to these Terms. If you do not agree, do not use the service."
      sections={[
        {
          heading: '1. Eligibility',
          body: 'You must be at least 18 years old and able to enter into a binding contract under the laws of your jurisdiction. You agree that any information you provide during registration is accurate and complete.',
        },
        {
          heading: '2. Accounts and roles',
          body: 'A single account may use both Closer and Seller views. You are responsible for activity that occurs under your account, including transactions initiated in either view.',
        },
        {
          heading: '3. Listings and claims',
          body: 'Sellers are responsible for the accuracy of every listing, including condition, price, and ownership. Closers are responsible for finding a qualified buyer within the claim window. MIDDLEMAN is a marketplace and is not a party to the underlying transaction.',
        },
        {
          heading: '4. Fees and commissions',
          body: 'MIDDLEMAN charges a platform fee on each completed transaction. Closer commissions are set per listing by the seller and paid out by MIDDLEMAN on the closer\'s behalf when the buyer confirms receipt.',
        },
        {
          heading: '5. Acceptable use',
          body: 'You may not use MIDDLEMAN to list illegal items, infringe on intellectual property, harass other users, or attempt to bypass platform fees. We may suspend or terminate accounts that violate these rules.',
        },
        {
          heading: '6. Disclaimers and liability',
          body: 'The service is provided "as is" without warranty of any kind. To the maximum extent permitted by law, MIDDLEMAN is not liable for indirect, incidental, or consequential damages arising from your use of the platform.',
        },
        {
          heading: '7. Changes to these terms',
          body: 'We may update these Terms from time to time. Material changes will be announced via email or in-app notice. Continued use after the effective date constitutes acceptance of the updated Terms.',
        },
      ]}
      footer="These Terms are a sample and do not constitute legal advice. Replace with your reviewed terms before launch."
    />
  );
}
