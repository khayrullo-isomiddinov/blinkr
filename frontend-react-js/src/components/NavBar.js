import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const linkClass = (active) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    active ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
  }`;

export default function NavBar({ user, onSignOut }) {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2 px-4 py-3">
        <Link to="/" className="text-xl font-extrabold text-emerald-400 hover:text-emerald-300 mr-4">
          Blinkr
        </Link>
        <Link to="/" className={linkClass(pathname === '/')}>Home</Link>
        <Link to="/explore" className={linkClass(pathname === '/explore')}>Browse</Link>
        <Link to="/notifications" className={linkClass(pathname === '/notifications')}>Following</Link>
        <div className="flex-1" />
        {user ? (
          <>
            <Link to={`/@${user.handle}`} className={linkClass(pathname === `/@${user.handle}`)}>
              @{user.handle}
            </Link>
            <button
              onClick={onSignOut}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link to="/signin" className={linkClass(pathname === '/signin')}>Sign In</Link>
        )}
      </div>
    </nav>
  );
}
