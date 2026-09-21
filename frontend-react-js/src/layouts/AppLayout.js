import React from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useSignOut } from '../features/auth/useSignOut';

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded text-sm font-medium ${isActive ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-900'}`;

export default function AppLayout() {
  const signOut = useSignOut();
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
          <Link to="/workouts" className="text-lg font-extrabold text-emerald-400 hover:text-emerald-300">Blinkr</Link>
          <nav aria-label="Main" className="flex gap-1 flex-1">
            <NavLink to="/workouts" className={linkClass}>Workouts</NavLink>
            <NavLink to="/exercises" className={linkClass}>Exercises</NavLink>
          </nav>
          <button type="button" onClick={signOut} className="btn-secondary">Sign out</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
