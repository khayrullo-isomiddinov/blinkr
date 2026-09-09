import React from 'react';

// Purely decorative product-marketing banner -- no fabricated per-user
// engagement numbers, just generic aspirational copy (same category as the
// "v2.0" badge elsewhere).
export default function SpotlightBanner() {
  return (
    <article className="relative overflow-hidden rounded-xl bg-surface-container-low shadow-md">
      <div className="w-full h-56 relative flex flex-col justify-end p-space-lg bg-gradient-to-br from-tertiary-container via-primary-container to-secondary-container">
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/70 to-transparent" />
        <div className="relative z-10 flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-label-xs text-label-xs px-space-xs py-space-2xs bg-secondary-container text-on-secondary-container rounded font-bold uppercase tracking-wider">
              Editorial Spotlight
            </span>
            <span className="font-label-xs text-label-xs text-secondary-fixed flex items-center gap-space-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> Live
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
            Next-gen frontend architectures: how teams migrate to edge compute & islands
          </h2>
        </div>
      </div>
    </article>
  );
}
