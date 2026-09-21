import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAdmin } from './RequireAdmin';
import { useSignOut } from '../auth/useSignOut';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/infrastructure', label: 'Infrastructure' },
  { to: '/admin/observability', label: 'Observability' },
  { to: '/admin/settings', label: 'Settings' },
];

function navLinkClass({ isActive }) {
  const base = 'block px-3 py-2 rounded text-sm font-medium';
  return isActive
    ? `${base} bg-gray-800 text-white`
    : `${base} text-gray-400 hover:bg-gray-800 hover:text-gray-100`;
}

function Brand() {
  return (
    <div>
      <span className="text-lg font-extrabold text-emerald-400">Blinkr</span>
      <span className="ml-2 text-xs uppercase tracking-wide text-gray-500">Operations</span>
    </div>
  );
}

export default function AdminLayout() {
  const admin = useAdmin();
  const signOut = useSignOut();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="dark min-h-screen md:flex bg-gray-950 text-gray-100">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:px-3 focus:py-2 focus:bg-gray-800 focus:rounded">
        Skip to content
      </a>

      <header className="md:hidden flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          className="px-3 py-1 rounded text-sm border border-gray-700 hover:bg-gray-800"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      <aside
        id="admin-sidebar"
        className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:w-60 md:shrink-0 md:min-h-screen border-b md:border-b-0 md:border-r border-gray-800 bg-gray-900`}
      >
        <div className="hidden md:block px-4 py-5 border-b border-gray-800">
          <Brand />
        </div>
        <nav aria-label="Admin" className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass} onClick={() => setMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-800 p-4 text-sm">
          <p className="text-gray-500">Signed in as</p>
          <p className="font-medium text-gray-100 truncate" data-testid="admin-username">{admin && admin.username}</p>
          <button type="button" onClick={signOut} className="mt-3 px-3 py-1.5 rounded text-sm border border-gray-700 hover:bg-gray-800">
            Sign out
          </button>
        </div>
      </aside>

      <main id="admin-main" className="flex-1 min-w-0 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
