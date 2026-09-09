import React from 'react';

import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import RightSidebar from './RightSidebar';

// Shared page shell: mobile header, left nav, centered feed-width column,
// right sidebar, mobile bottom nav. Every top-level page renders its own
// content as children inside this.
export default function AppShell({ user, active, onComposeClick, suggestedUsers, children }) {
  return (
    <div className="bg-background min-h-screen">
      <MobileHeader user={user} />
      <Sidebar user={user} active={active} onComposeClick={onComposeClick} />

      <div className="md:pl-col-sidebar-left min-h-screen">
        <div className="max-w-7xl mx-auto flex justify-center">
          <main className="w-full max-w-col-feed-max pt-14 md:pt-0 pb-20 md:pb-space-3xl px-space-base bg-background min-h-screen">
            <div className="flex flex-col w-full">{children}</div>
          </main>

          <RightSidebar user={user} suggestedUsers={suggestedUsers} />
        </div>
      </div>

      <MobileNav active={active} onComposeClick={onComposeClick} />
    </div>
  );
}
