import React from 'react';
import { Link } from 'react-router-dom';

export default function ProfileHeader({ handle, displayName, blinkCount, isOwnProfile }) {
  const initial = (displayName || handle).charAt(0).toUpperCase();

  return (
    <>
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 py-space-sm px-space-xs flex items-center justify-between mb-space-sm">
        <div className="flex items-center gap-space-md min-w-0">
          <Link to="/" className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors shrink-0">
            <span className="material-symbols-outlined text-[18px] text-on-surface">arrow_back</span>
          </Link>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-headline-sm text-on-surface truncate">{displayName || handle}</span>
            <span className="font-label-xs text-label-xs text-outline">{blinkCount} Blinks</span>
          </div>
        </div>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-br from-surface-container-lowest via-surface-container to-surface-container-high h-32 sm:h-40" />

      <div className="px-space-sm relative -mt-14 mb-space-lg">
        <div className="flex items-end justify-between">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-background shadow-xl">
            <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center font-display-lg text-display-lg text-primary font-bold">
              {initial}
            </div>
          </div>
          <div className="flex items-center gap-space-xs pb-space-xs">
            <button className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-on-surface transition-all shadow-sm">
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
            {isOwnProfile ? (
              <button className="px-space-md py-space-xs bg-primary hover:bg-inverse-primary text-on-primary font-label-sm text-label-sm rounded-full transition-all shadow-sm">
                Edit Profile
              </button>
            ) : (
              <button className="px-space-md py-space-xs bg-primary-container hover:bg-inverse-primary text-on-primary-container hover:text-on-surface font-label-sm text-label-sm rounded-full transition-all shadow-sm">
                Follow
              </button>
            )}
          </div>
        </div>

        <div className="mt-space-sm flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">{displayName || handle}</h1>
          </div>
          <span className="font-body-sm text-body-sm text-outline">@{handle}</span>
        </div>

        <div className="mt-space-md pt-space-sm flex items-center gap-space-2xs">
          <span className="font-label-md text-label-md font-semibold text-on-surface">{blinkCount}</span>
          <span className="font-body-sm text-body-sm text-outline">Blinks</span>
        </div>
      </div>
    </>
  );
}
