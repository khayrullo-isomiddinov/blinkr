import React from 'react';
import { NavLink, Link, Outlet, useMatch } from 'react-router-dom';
import { useSignOut } from '../features/auth/useSignOut';
import { useStartWorkout } from '../features/workouts/useStartWorkout';
import { ProfileProvider, useProfile } from '../features/profile/ProfileContext';
import Avatar from '../components/Avatar';
import { ListIcon, Dumbbell } from '../components/icons';

const topLink = ({ isActive }) =>
  `rounded-lg px-3.5 py-2 text-[15px] hover:no-underline ${isActive ? 'bg-ink-800 font-semibold text-fg' : 'text-fg-mute hover:text-fg'}`;

const tabLink = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-1 text-[11px] hover:no-underline ${isActive ? 'font-semibold text-accent' : 'text-fg-mute'}`;

function Shell() {
  const signOut = useSignOut();
  const { start, starting, error } = useStartWorkout();
  const { profile } = useProfile();
  // The workout screen has its own header, so the phone chrome steps aside there.
  const onWorkout = Boolean(useMatch('/workouts/:id'));

  return (
    <div className="min-h-screen">
      <header className={`${onWorkout ? 'hidden lg:flex' : 'flex'} h-14 items-center gap-4 border-b border-ink-700 px-4 sm:h-[68px] sm:gap-8 sm:px-12`}>
        <Link to="/workouts" className="font-display text-2xl font-extrabold tracking-tight text-fg hover:no-underline">Blinkr</Link>
        <nav aria-label="Main" className="hidden flex-1 gap-1 sm:flex">
          <NavLink to="/workouts" className={topLink}>Workouts</NavLink>
          <NavLink to="/exercises" className={topLink}>Exercises</NavLink>
        </nav>
        <span className="flex-1 sm:hidden" />
        <button type="button" onClick={start} disabled={starting} className="btn-primary hidden sm:inline-flex">
          {starting ? 'Starting...' : 'Start workout'}
        </button>
        <div className="hidden items-center gap-3 sm:flex">
          <NavLink to="/profile" aria-label="Your profile" className="flex items-center gap-2 text-sm text-fg-soft hover:text-fg hover:no-underline">
            <Avatar profile={profile} size={28} />
            {profile && <span className="max-w-[10rem] truncate">{profile.display_name}</span>}
          </NavLink>
          <button type="button" onClick={signOut} className="btn-secondary">Sign out</button>
        </div>
      </header>

      {error && <div role="alert" className="alert-error m-4">{error}</div>}

      <Outlet />

      <nav
        aria-label="Main"
        className={`${onWorkout ? 'hidden' : 'grid'} fixed inset-x-0 bottom-0 z-30 h-[68px] grid-cols-3 border-t border-ink-700 bg-ink-900 sm:hidden`}
      >
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
