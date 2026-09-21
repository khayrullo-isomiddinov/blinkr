import React from 'react';
import PublicPage, { Section } from '../../components/PublicPage';
import { SUPPORT_EMAIL, DEVELOPER_NAME } from '../../lib/contact';

export default function SupportPage() {
  const mail = (subject) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  return (
    <PublicPage title="Contact support">
      <p>Blinkr is built and looked after by {DEVELOPER_NAME}. If something is broken, confusing or missing, write to me directly.</p>

      <Section title="Get help">
        <p>
          Email <a href={mail('Blinkr support')}>{SUPPORT_EMAIL}</a>. It helps to include the username you sign in with, what you were doing, and what you expected to happen.
          Please never send your password.
        </p>
        <a href={mail('Blinkr support')} className="btn-primary hover:text-accent-ink">Email support</a>
      </Section>

      <Section title="Developer">
        <p>{DEVELOPER_NAME}, developer and administrator of Blinkr.</p>
      </Section>

      <Section title="Contribute">
        <p>
          Interested in contributing to Blinkr, or have an idea worth building? Contact me at the same address:{' '}
          <a href={mail('Contributing to Blinkr')}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
    </PublicPage>
  );
}
