import React from 'react';

// The Blinkr mark: a cowled head over a V-taper body. Filled with currentColor; the eyes are true cut-outs, so it sits on any background.
const HEAD = 'M72 10 L90 36 L110 36 L128 10 L136 54 L130 82 L114 100 L100 106 L86 100 L70 82 L64 54 Z';
const EYES = 'M76 58 L96 66 L92 73 L76 66 Z M124 58 L104 66 L108 73 L124 66 Z';
const BODY = 'M28 124 L86 124 L100 138 L114 124 L172 124 L138 196 L62 196 Z';

export function LogoMark({ size = 32, className = '', label }) {
  return (
    <svg
      width={Math.round((size * 152) / 194)}
      height={size}
      viewBox="24 6 152 194"
      fill="currentColor"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={BODY} />
      <path d={`${HEAD} ${EYES}`} fillRule="evenodd" />
    </svg>
  );
}

export function Logo({ size = 28, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="text-accent" />
      <span className="font-display font-extrabold leading-none tracking-tight text-fg" style={{ fontSize: Math.round(size * 0.92) }}>Blinkr</span>
    </span>
  );
}
