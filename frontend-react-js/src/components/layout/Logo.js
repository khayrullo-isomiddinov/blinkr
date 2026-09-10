import React from 'react';

const SIZES = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-28 h-28 rounded-3xl',
};

// Stylized eye mark, inline SVG so it scales cleanly at every size.
export default function Logo({ size = 'sm' }) {
  return (
    <span
      className={`flex items-center justify-center ${SIZES[size]} bg-gradient-to-br from-primary-container to-tertiary-container text-on-primary-container shadow-sm shrink-0`}
    >
      <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 12C2 12 6.5 6 12 6C17.5 6 22 12 22 12C22 12 17.5 18 12 18C6.5 18 2 12 2 12Z"
          fill="currentColor"
          fillOpacity="0.35"
        />
        <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      </svg>
    </span>
  );
}
