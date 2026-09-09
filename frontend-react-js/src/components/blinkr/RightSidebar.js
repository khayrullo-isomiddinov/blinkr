import React from 'react';

const TRENDING = [
  { topic: '#TypeScript5', category: 'Technology', count: '24.8K Blinks' },
  { topic: 'Edge Compute', category: 'Systems', count: '18.2K Blinks' },
  { topic: 'Autonomous Agents', category: 'AI', count: '42.1K Blinks' },
];

export default function RightSidebar({ user, suggestedUsers = [] }) {
  return (
    <aside className="hidden lg:block w-col-sidebar-right shrink-0 sticky top-0 h-screen overflow-y-auto px-space-base py-space-lg">
      <div className="flex flex-col gap-space-lg">
        <div className="flex items-center bg-surface-container-low px-space-base py-space-sm rounded-full text-on-surface-variant focus-within:text-on-surface focus-within:bg-surface-container transition-all">
          <span className="material-symbols-outlined mr-space-sm text-[18px]">search</span>
          <input
            className="bg-transparent border-0 outline-none w-full font-body-sm text-body-sm text-on-surface placeholder:text-outline"
            placeholder="Search Blinkr"
            type="text"
          />
        </div>

        <div className="bg-surface-container-low p-space-base rounded-xl flex flex-col gap-space-md">
          <span className="font-headline-sm text-headline-sm text-on-surface">What's happening</span>
          <div className="flex flex-col gap-space-md">
            {TRENDING.map((item) => (
              <div key={item.topic} className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-label-xs text-label-xs text-outline">{item.category} · Trending</span>
                  <span className="font-label-md text-label-md font-semibold text-on-surface">{item.topic}</span>
                  <span className="font-body-sm text-body-sm text-outline">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {suggestedUsers.length > 0 && (
          <div className="bg-surface-container-low p-space-base rounded-xl flex flex-col gap-space-md">
            <span className="font-headline-sm text-headline-sm text-on-surface">Who to follow</span>
            <div className="flex flex-col gap-space-md">
              {suggestedUsers.map((person) => (
                <div key={person.handle} className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-highest font-label-md text-label-md text-primary font-bold shrink-0">
                      {(person.display_name || person.handle).charAt(0).toUpperCase()}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate">{person.display_name}</span>
                      <span className="font-body-sm text-body-sm text-outline truncate">@{person.handle}</span>
                    </div>
                  </div>
                  <button className="px-space-md py-space-xs bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-sm text-label-sm rounded-full transition-all shrink-0">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="flex flex-wrap gap-x-space-sm gap-y-space-2xs px-space-xs text-outline font-label-xs text-label-xs">
          <a className="hover:text-on-surface transition-colors" href="#">Terms of Service</a>
          <a className="hover:text-on-surface transition-colors" href="#">Privacy Policy</a>
          <span>© 2026 Blinkr</span>
        </footer>
      </div>
    </aside>
  );
}
