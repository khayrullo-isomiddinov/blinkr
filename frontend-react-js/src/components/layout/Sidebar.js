import React from 'react';
import { Link } from 'react-router-dom';
import { signOut as authSignOut } from '../../lib/auth';
import Logo from './Logo';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: 'home', to: '/' },
  { key: 'explore', label: 'Explore', icon: 'explore', to: '/explore' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications', to: '/notifications' },
  { key: 'messages', label: 'Messages', icon: 'chat_bubble', to: '/messages' },
  { key: 'bookmarks', label: 'Bookmarks', icon: 'bookmark', to: null },
  { key: 'settings', label: 'Settings', icon: 'settings', to: null },
];

export default function Sidebar({ user, active, onComposeClick }) {
  const signOut = async () => {
    try {
      await authSignOut();
      window.location.href = '/';
    } catch (error) {
      console.log('error signing out: ', error);
    }
  };

  const profileTo = user ? `/@${user.handle}` : '/signin';

  return (
    <aside className="fixed left-0 top-0 h-full w-col-sidebar-left bg-surface-container-low z-30 hidden md:flex flex-col justify-between p-space-base">
      <div className="flex flex-col gap-space-lg">
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-space-sm">
            <Logo size="md" />
            <span className="font-headline-md text-headline-md text-on-surface">Blinkr</span>
          </div>
          <span className="font-label-xs text-label-xs px-space-xs py-space-2xs bg-surface-container-highest text-primary font-bold rounded-full">
            v2.0
          </span>
        </div>

        <nav className="flex flex-col gap-space-xs">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            const classes = [
              'flex items-center justify-between px-space-base py-space-sm rounded-full transition-all',
              isActive
                ? 'bg-primary-container text-on-primary-container font-semibold'
                : item.to
                ? 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                : 'text-outline cursor-default',
            ].join(' ');

            const content = (
              <div className="flex items-center gap-space-md">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </div>
            );

            if (!item.to) {
              return (
                <span key={item.key} className={classes} title="Coming soon">
                  {content}
                </span>
              );
            }

            return (
              <Link key={item.key} to={item.to} className={classes}>
                {content}
              </Link>
            );
          })}
          <Link
            to={profileTo}
            className={[
              'flex items-center justify-between px-space-base py-space-sm rounded-full transition-all',
              active === 'profile'
                ? 'bg-primary-container text-on-primary-container font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            ].join(' ')}
          >
            <div className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span className="font-label-md text-label-md">Profile</span>
            </div>
          </Link>
        </nav>

        {user && (
          <button
            onClick={onComposeClick}
            className="w-full mt-space-xs py-space-md px-space-base bg-primary-container hover:bg-inverse-primary text-on-primary-container hover:text-on-surface rounded-full flex items-center justify-center gap-space-sm transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="font-label-md text-label-md font-semibold">Blink</span>
          </button>
        )}
      </div>

      {user ? (
        <div
          onClick={signOut}
          title="Sign out"
          className="flex items-center justify-between p-space-sm rounded-full hover:bg-surface-container transition-all cursor-pointer"
        >
          <div className="flex items-center gap-space-sm min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-highest text-primary font-label-md font-bold shrink-0">
              {(user.display_name || user.handle || '?').charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">
                {user.display_name || user.handle}
              </span>
              <span className="font-body-sm text-body-sm text-outline truncate">@{user.handle}</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-outline hover:text-on-surface shrink-0">logout</span>
        </div>
      ) : (
        <Link
          to="/signin"
          className="flex items-center justify-center p-space-sm rounded-full bg-primary-container text-on-primary-container hover:bg-inverse-primary hover:text-on-surface font-label-md text-label-md font-semibold transition-all"
        >
          Sign in
        </Link>
      )}
    </aside>
  );
}
