import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowUp } from './icons';
import { DEVELOPER_NAME } from '../lib/contact';

const heading = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-chrome-mute mb-3';
const link = 'block py-1.5 text-[15px] text-chrome-soft hover:text-chrome-fg hover:no-underline';

function backToTop() {
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
}

// `signedIn` decides whether the app links are useful; `clearNav` leaves room for the phone's bottom bar.
export default function Footer({ signedIn = false, clearNav = false, className = '' }) {
  return (
    <footer className={`border-t border-chrome-line bg-chrome text-chrome-fg ${className}`}>
      <div className={`mx-auto w-full max-w-6xl px-5 pt-10 sm:px-8 lg:px-12 lg:pt-14 ${clearNav ? 'pb-28 sm:pb-8' : 'pb-8'}`}>
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1.3fr] lg:gap-14">
          <div>
            <Logo size={34} variant="chrome" />
            <p className="mt-5 font-display text-2xl font-extrabold leading-tight tracking-tight">Plan. Train. Log. Repeat.</p>
            <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-chrome-mute">Know what you are lifting today, and beat what you lifted last time.</p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:contents">
            {signedIn ? (
              <nav aria-label="App">
                <p className={heading}>App</p>
                <Link to="/calendar" className={link}>Calendar</Link>
                <Link to="/workouts" className={link}>Workouts</Link>
                <Link to="/exercises" className={link}>Exercises</Link>
                <Link to="/profile" className={link}>Profile</Link>
              </nav>
            ) : (
              <nav aria-label="Account">
                <p className={heading}>Account</p>
                <Link to="/signup" className={link}>Create account</Link>
                <Link to="/signin" className={link}>Sign in</Link>
              </nav>
            )}
            <nav aria-label="Help">
              <p className={heading}>Help</p>
              <Link to="/support" className={link}>Contact support</Link>
              <Link to="/privacy" className={link}>Privacy policy</Link>
              <Link to="/terms" className={link}>Terms and conditions</Link>
              {signedIn && <Link to="/settings" className={link}>Settings</Link>}
            </nav>
          </div>

          <div className="rounded-lg border border-chrome-line bg-chrome-raised p-5 sm:col-span-2 lg:col-span-1 lg:border-0 lg:bg-transparent lg:p-0">
            <p className={heading}>Built by</p>
            <p className="font-display text-[22px] font-extrabold leading-tight">{DEVELOPER_NAME}</p>
            <p className="mb-4 mt-2 text-sm leading-relaxed text-chrome-mute">Want to help build Blinkr? Get in touch.</p>
            <Link to="/support" className="btn-chrome">Contact {DEVELOPER_NAME}</Link>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-chrome-line pt-5 text-[13px] text-chrome-mute">
          <span>© {new Date().getFullYear()} Blinkr</span>
          <button type="button" onClick={backToTop} className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 hover:text-chrome-fg">
            Back to top <ArrowUp width={16} height={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}
