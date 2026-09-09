import React from 'react';

// Decorative topic card -- generic trending-topics chrome, same category as
// the "v2.0"/"Pulse" badges. No backend for real trend velocity exists yet.
export default function TrendingCard({ rank, category, topic, description, count }) {
  return (
    <div className="flex flex-col justify-between p-space-base rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm">
      <div className="flex flex-col gap-space-2xs">
        <span className="font-label-xs text-label-xs text-outline font-semibold tracking-wider uppercase">
          {rank} · {category}
        </span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">{topic}</h3>
        <p className="font-body-sm text-body-sm text-outline line-clamp-2 mt-space-2xs">{description}</p>
      </div>
      <div className="flex items-center justify-between mt-space-md pt-space-xs">
        <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">{count}</span>
        <svg className="w-20 h-6 text-secondary" fill="none" viewBox="0 0 100 30">
          <path
            d="M0 25 L20 22 L40 18 L60 21 L80 10 L100 8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
        </svg>
      </div>
    </div>
  );
}
