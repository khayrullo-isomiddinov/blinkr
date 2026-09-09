import React from 'react';

export default function MobileHeader({ user }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-40 bg-surface/80 backdrop-blur-xl md:hidden px-space-base flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-space-sm">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-headline-sm font-bold">
          B
        </span>
        <span className="font-headline-sm text-headline-sm text-on-surface">Blinkr</span>
      </div>
      {user && (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-highest text-primary font-label-sm font-bold">
          {(user.display_name || user.handle || '?').charAt(0).toUpperCase()}
        </span>
      )}
    </header>
  );
}
