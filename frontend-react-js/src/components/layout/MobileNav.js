import React from 'react';
import { Link } from 'react-router-dom';

export default function MobileNav({ active, onComposeClick }) {
  const linkClass = (key) =>
    key === active ? 'flex flex-col items-center text-primary' : 'flex flex-col items-center text-on-surface-variant hover:text-on-surface';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface/90 backdrop-blur-xl z-40 flex items-center justify-around px-space-sm shadow-sm">
      <Link to="/" className={linkClass('home')}>
        <span className="material-symbols-outlined">home</span>
      </Link>
      <span className="flex flex-col items-center text-outline">
        <span className="material-symbols-outlined">search</span>
      </span>
      <button
        onClick={onComposeClick}
        className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm"
      >
        <span className="material-symbols-outlined">add</span>
      </button>
      <Link to="/notifications" className={linkClass('notifications')}>
        <span className="material-symbols-outlined">notifications</span>
      </Link>
      <Link to="/messages" className={linkClass('messages')}>
        <span className="material-symbols-outlined">chat_bubble</span>
      </Link>
    </nav>
  );
}
