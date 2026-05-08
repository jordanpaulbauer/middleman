import React from 'react';
import ContentPage from '../components/ContentPage';

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy Policy"
      lastUpdated="May 7, 2026"
      intro="This policy describes what information MIDDLEMAN collects, how we use it, and the choices you have."
      sections={[
        {
          heading: 'Information we collect',
          body: 'When you register, we collect your name and email address. When you transact, we collect listing details, transaction amounts, and the parties involved. We also collect basic technical data such as IP address, device type, and browser, used for security and analytics.',
        },
        {
          heading: 'How we use information',
          body: 'We use your information to operate the marketplace, process payouts, prevent fraud, communicate with you about your account, and improve the product. We do not sell your personal information to third parties.',
        },
        {
          heading: 'Sharing with service providers',
          body: 'We share information only with vendors that help us operate the service, including payment processors, email providers, and analytics tools. These vendors are contractually required to use your information only on our behalf.',
        },
        {
          heading: 'Your choices',
          body: 'You can update your profile or delete your account at any time from your account settings. You can opt out of non-essential email by adjusting notification preferences.',
        },
        {
          heading: 'Data retention',
          body: 'We retain account and transaction data for as long as your account is active and for a reasonable period afterward to comply with tax, legal, and dispute-handling obligations.',
        },
        {
          heading: 'Contact',
          body: 'Questions about this policy can be sent to privacy@middleman.example.',
        },
      ]}
      footer="This policy is a sample and does not constitute legal advice. Replace with your reviewed privacy policy before launch."
    />
  );
}
