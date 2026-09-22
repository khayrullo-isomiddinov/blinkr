import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from './icons';
import { Logo } from './Logo';
import Footer from './Footer';
import { useSession } from '../features/auth/useSession';

export function LegalLinks({ className = '' }) {
  return (
    <nav aria-label="Help and legal" className={`flex flex-wrap gap-x-5 gap-y-2 text-sm ${className}`}>
      <Link to="/support" className="text-fg-mute hover:text-fg">Contact support</Link>
      <Link to="/privacy" className="text-fg-mute hover:text-fg">Privacy policy</Link>
      <Link to="/terms" className="text-fg-mute hover:text-fg">Terms and conditions</Link>
    </nav>
  );
}

// Support and legal pages are readable signed in or out, so they sit outside the app shell.
export default function PublicPage({ title, children }) {
  const navigate = useNavigate();
  const session = useSession();
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center gap-2 border-b border-ink-700 px-4 sm:px-8">
        <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center text-fg">
          <ChevronLeft width={22} height={22} />
        </button>
        <Link to="/" aria-label="Blinkr home" className="hover:no-underline"><Logo size={26} /></Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-8">
        <h1 className="font-display text-[34px] font-extrabold leading-tight tracking-tight">{title}</h1>
        <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-fg-soft">{children}</div>
      </main>
      <Footer signedIn={session === 'in'} />
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-bold text-fg">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
