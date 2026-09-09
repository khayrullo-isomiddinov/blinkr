import React from "react";

import AppShell from '../components/layout/AppShell';
import { useAuthUser } from '../lib/useAuthUser';

const FILTERS = ['All', 'Mentions', 'Replies', 'Likes', 'Reposts'];

export default function NotificationsFeedPage() {
  const [activeFilter, setActiveFilter] = React.useState('All');
  const user = useAuthUser();

  return (
    <AppShell user={user} active="notifications">
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-xl px-space-base pt-space-xs pb-space-sm flex flex-col gap-space-sm shadow-sm">
        <div className="flex items-center justify-between py-space-xs">
          <h1 className="font-headline-md text-headline-md text-on-surface">Notifications</h1>
          <div className="flex items-center gap-space-xs">
            <span className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all">
              <span className="material-symbols-outlined text-[20px]">done_all</span>
            </span>
            <span className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-xs overflow-x-auto py-space-xs">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-space-md py-space-xs rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all ${
                activeFilter === filter
                  ? 'bg-primary-container text-on-primary-container font-semibold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      <div className="py-space-3xl flex flex-col items-center justify-center gap-space-sm text-outline">
        <span className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">notifications</span>
        </span>
        <span className="font-label-md text-label-md text-on-surface-variant">No notifications yet</span>
        <span className="font-body-sm text-body-sm text-outline text-center max-w-xs">
          Likes, replies, and mentions will show up here once there's activity on your Blinks.
        </span>
      </div>
    </AppShell>
  );
}
