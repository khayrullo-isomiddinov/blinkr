import React from 'react';
import { Link } from 'react-router-dom';
import PublicPage, { Section } from '../../components/PublicPage';
import { SUPPORT_EMAIL } from '../../lib/contact';

export default function PrivacyPage() {
  return (
    <PublicPage title="Privacy policy">
      <p className="text-sm text-fg-mute">Last updated 22 September 2026</p>
      <p>This policy explains what Blinkr, a workout-logging app, collects about you, why, and what you can do about it.</p>

      <Section title="What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-fg">Account details:</strong> your name, email address and username. Your password is handled by our sign-in provider, Amazon Cognito, and is never visible to us.</li>
          <li><strong className="text-fg">Profile:</strong> a display name and, if you add one, a profile photo.</li>
          <li><strong className="text-fg">Workout data:</strong> the workouts you start and complete, the exercises you add to them, and the sets you log (reps, weight, unit, set type) with their times.</li>
          <li><strong className="text-fg">Technical data:</strong> standard server logs such as IP address and requested pages, and error reports, used to keep the service running.</li>
          <li><strong className="text-fg">On your device:</strong> your sign-in session and your light or dark choice are kept in your browser's storage. We do not use advertising cookies.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <p>To run Blinkr for you, keep it secure, fix problems and answer your messages. When you complete a workout, the app also records an internal event (your internal user ID and the workout ID) that feeds internal statistics. We do not sell your data and we do not show advertising.</p>
      </Section>

      <Section title="Where it is stored">
        <p>Your data is stored with Amazon Web Services in the EU (Frankfurt) region. AWS and the monitoring tools we use to detect faults act as service providers to us. We share information beyond that only if the law requires it.</p>
      </Section>

      <Section title="Keeping and deleting your data">
        <p>
          You can delete your account at any time in <Link to="/settings">Settings</Link>. This removes your sign-in account, profile, photo and workouts. Exercises added to the shared exercise library are not tied to your account and stay for other users.
          Internal statistics derived from your workouts are stored against an internal ID that no longer points to a person once your account is deleted, and may be kept. Backups and logs can hold copies for a limited time before they are overwritten.
        </p>
      </Section>

      <Section title="Your rights">
        <p>You can ask to see, correct or delete your data, or object to how it is used. Most of this you can do yourself in Settings and on your profile; for anything else, email <a href={`mailto:${SUPPORT_EMAIL}?subject=Blinkr%20privacy`}>{SUPPORT_EMAIL}</a>.</p>
      </Section>

      <Section title="Children">
        <p>Blinkr is not intended for children under 16, and we do not knowingly collect their data.</p>
      </Section>

      <Section title="Changes">
        <p>If this policy changes in a meaningful way, we will update the date above and, where appropriate, tell you in the app.</p>
      </Section>
    </PublicPage>
  );
}
