import React from 'react';

// Real user + their real latest post as the teaser -- unlike the mockup's
// fabricated bios and quotes, everything here is drawn from actual data.
export default function CreatorCard({ person }) {
  const initial = (person.display_name || person.handle).charAt(0).toUpperCase();

  return (
    <div className="p-space-base rounded-xl bg-surface-container-low flex flex-col justify-between gap-space-md hover:bg-surface-container transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          <span className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center font-headline-sm text-headline-sm text-primary font-bold shrink-0">
            {initial}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
              {person.display_name || person.handle}
            </span>
            <span className="font-body-sm text-body-sm text-outline truncate">@{person.handle}</span>
          </div>
        </div>
        <button className="px-space-md py-space-xs rounded-full bg-primary-container text-on-primary-container hover:bg-inverse-primary hover:text-on-surface font-label-sm text-label-sm font-semibold transition-all shrink-0">
          Follow
        </button>
      </div>
      {person.latestMessage && (
        <div className="bg-surface-container-high/60 p-space-sm rounded-lg flex flex-col gap-space-2xs">
          <span className="font-label-xs text-label-xs text-outline font-bold flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-[13px] text-tertiary">chat_bubble</span> LATEST BLINK
          </span>
          <p className="font-body-sm text-body-sm text-on-surface line-clamp-2">{person.latestMessage}</p>
        </div>
      )}
    </div>
  );
}
