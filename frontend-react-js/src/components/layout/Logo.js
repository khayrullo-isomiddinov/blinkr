import React from 'react';

const SIZES = {
  sm: 'w-8 h-8 rounded-lg font-headline-sm text-headline-sm',
  md: 'w-9 h-9 rounded-xl font-headline-sm text-headline-sm',
  lg: 'w-28 h-28 rounded-3xl font-display-lg text-display-lg',
};

// Placeholder mark until a real logo asset exists -- swap the span below
// for an <img src="..."> once one does, everything else stays the same.
export default function Logo({ size = 'sm' }) {
  return (
    <span
      className={`flex items-center justify-center ${SIZES[size]} bg-gradient-to-br from-primary-container to-tertiary-container text-on-primary-container font-bold shadow-sm shrink-0`}
    >
      B
    </span>
  );
}
