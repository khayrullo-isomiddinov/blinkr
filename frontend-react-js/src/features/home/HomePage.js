import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSession } from '../auth/useSession';
import { LegalLinks } from '../../components/PublicPage';
import { Logo, LogoMark } from '../../components/Logo';

export default function HomePage() {
  const status = useSession();
  if (status === 'in') return <Navigate to="/calendar" replace />;

  return (
    <div className="flex min-h-screen flex-col px-6 py-6">
      <Logo size={32} />
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-between gap-12 pb-16">
        <div className="max-w-xl">
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Log your training. Keep getting stronger.</h1>
        <p className="mt-5 max-w-md text-lg text-fg-mute">
          Start a workout, record your exercises and every set, and keep your training history.
        </p>
        {status === 'out' && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="btn-primary h-12 px-6 text-base text-accent-ink hover:text-accent-ink">Create account</Link>
            <Link to="/signin" className="btn-secondary h-12 px-6 text-base text-fg hover:text-fg">Sign in</Link>
          </div>
        )}
        </div>
        <LogoMark size={340} className="hidden text-accent md:block" />
      </div>
      <LegalLinks className="mx-auto w-full max-w-4xl" />
    </div>
  );
}
