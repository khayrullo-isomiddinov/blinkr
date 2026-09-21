import React from 'react';
import { Link } from 'react-router-dom';
import PublicPage, { Section } from '../../components/PublicPage';
import { SUPPORT_EMAIL } from '../../lib/contact';

export default function TermsPage() {
  return (
    <PublicPage title="Terms and conditions">
      <p className="text-sm text-fg-mute">Last updated 22 September 2026</p>
      <p>By creating an account or using Blinkr you agree to these terms. If you do not agree, please do not use the app.</p>

      <Section title="The service">
        <p>Blinkr lets you record workouts, exercises and sets and review your training history. It is provided "as is" and may change, be interrupted or be withdrawn at any time.</p>
      </Section>

      <Section title="Your account">
        <p>You must be at least 16 and give accurate details. Keep your password private; you are responsible for activity under your account. Tell us promptly if you think it has been misused.</p>
      </Section>

      <Section title="Acceptable use">
        <p>Do not use Blinkr unlawfully, try to access other people's data, disrupt or overload the service, or upload a profile photo you have no right to use or that is unlawful or abusive.</p>
      </Section>

      <Section title="Your content">
        <p>Your workout data and profile remain yours. You give us permission to store it and show it back to you so the app can work. Exercises you add to the shared library are visible to other users.</p>
      </Section>

      <Section title="Health">
        <p>Blinkr is a logbook, not medical or coaching advice. Exercise carries risk; train within your limits and speak to a professional if you have health concerns.</p>
      </Section>

      <Section title="Ending your use">
        <p>You can delete your account at any time in <Link to="/settings">Settings</Link>. We may suspend or remove accounts that break these terms.</p>
      </Section>

      <Section title="Liability">
        <p>To the fullest extent the law allows, Blinkr is not liable for indirect or consequential loss, or for loss of data or availability. Nothing here limits rights you have by law that cannot be limited.</p>
      </Section>

      <Section title="Changes and contact">
        <p>We may update these terms and will change the date above when we do; continuing to use Blinkr means you accept the update. Questions: <a href={`mailto:${SUPPORT_EMAIL}?subject=Blinkr%20terms`}>{SUPPORT_EMAIL}</a>. See also our <Link to="/privacy">privacy policy</Link>.</p>
      </Section>
    </PublicPage>
  );
}
