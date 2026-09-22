import React from 'react';
import { NavLink, Link, Outlet, useMatch } from 'react-router-dom';
import { useSignOut } from '../features/auth/useSignOut';
import { useStartWorkout } from '../features/workouts/useStartWorkout';
import { ProfileProvider, useProfile } from '../features/profile/ProfileContext';
import Avatar from '../components/Avatar';
import Footer from '../components/Footer';
import { Logo } from '../components/Logo';
import { CalendarIcon, ListIcon, Dumbbell } from '../components/icons';

const topLink = ({ isActive }) =>
  `border-b-2 px-1 py-2 text-xs font-semibold uppercase tracking-wider hover:no-underline ${isActive ? 'border-accent text-chrome-fg' : 'border-transparent text-chrome-mute hover:text-chrome-fg'}`;

const tabLink = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-1 text-[11px] hover:no-underline ${isActive ? 'font-semibold text-accent' : 'text-chrome-mute'}`;

function Shell() {
  const signOut = useSignOut();
  const { start, starting, error } = useStartWorkout();
  const { profile } = useProfile();
  // The workout screen has its own header, so the phone chrome steps aside there.
  const onWorkout = Boolean(useMatch('/workouts/:id'));

  return (
    <div className="min-h-screen">
      <header className={`${onWorkout ? 'hidden lg:flex' : 'flex'} h-14 items-center gap-4 border-b border-chrome-line bg-chrome px-4 sm:h-[68px] sm:gap-8 sm:px-12`}>
        <Link to="/calendar" aria-label="Blinkr, calendar" className="hover:no-underline"><Logo size={30} variant="chrome" /></Link>
        <nav aria-label="Main" className="hidden flex-1 gap-5 sm:flex">
          <NavLink to="/calendar" className={topLink}>Calendar</NavLink>
          <NavLink to="/plan" className={topLink}>Week Studio</NavLink>
          <NavLink to="/workouts" className={topLink}>Workouts</NavLink>
          <NavLink to="/exercises" className={topLink}>Exercises</NavLink>
        </nav>
        <span className="flex-1 sm:hidden" />
        <button type="button" onClick={start} disabled={starting} className="btn-primary hidden sm:inline-flex">
          {starting ? 'Starting...' : 'Start workout'}
        </button>
        <div className="hidden items-center gap-3 sm:flex">
          <NavLink to="/profile" aria-label="Your profile" className="flex items-center gap-2 text-sm text-chrome-soft hover:text-chrome-fg hover:no-underline">
            <Avatar profile={profile} size={28} />
            {profile && <span className="max-w-[10rem] truncate">{profile.display_name}</span>}
          </NavLink>
          <button type="button" onClick={signOut} className="btn-chrome">Sign out</button>
        </div>
      </header>

      {error && <div role="alert" className="alert-error m-4">{error}</div>}

      <Outlet />

      <Footer signedIn clearNav={!onWorkout} className={onWorkout ? 'hidden lg:block' : ''} />

      <nav
        aria-label="Main"
        className={`${onWorkout ? 'hidden' : 'grid'} fixed inset-x-0 bottom-0 z-30 h-[68px] grid-cols-4 border-t border-chrome-line bg-chrome sm:hidden`}
      >
        <NavLink to="/calendar" className={tabLink}><CalendarIcon width={24} height={24} />Calendar</NavLink>
        <NavLink to="/workouts" className={tabLink}><ListIcon width={24} height={24} />Workouts</NavLink>
        <NavLink to="/exercises" className={tabLink}><Dumbbell width={24} height={24} />Exercises</NavLink>
        <NavLink to="/profile" className={tabLink}><Avatar profile={profile} size={24} />Profile</NavLink>
      </nav>
    </div>
  );
}

export default function AppLayout() {
  return (
    <ProfileProvider>
      <Shell />
    </ProfileProvider>
  );
}
