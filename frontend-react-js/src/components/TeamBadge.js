import React from 'react';

// No image/logo pipeline exists (and building one is out of scope for this
// project) -- a bordered abbreviation box stands in as the team's "badge"
// wherever a logo would normally go.
export default function TeamBadge({ abbreviation, size }) {
  const sizeClass = size === 'lg'
    ? 'w-14 h-14 text-lg'
    : 'w-9 h-9 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${sizeClass} rounded-lg bg-gray-800 border border-gray-700 font-bold text-gray-100`}
    >
      {abbreviation}
    </span>
  );
}
