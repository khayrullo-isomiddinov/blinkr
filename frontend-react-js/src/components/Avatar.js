import React from 'react';

export default function Avatar({ profile, size = 32, alt = '', className = '' }) {
  const name = (profile && (profile.display_name || profile.handle)) || '';
  const style = { width: size, height: size };
  if (profile && profile.avatar) {
    return <img src={profile.avatar} alt={alt} style={style} className={`flex-none rounded-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden="true" style={{ ...style, fontSize: Math.round(size * 0.38) }} className={`flex flex-none items-center justify-center rounded-full bg-ink-600 font-semibold text-fg ${className}`}>
      {name.trim().slice(0, 2).toUpperCase() || '?'}
    </span>
  );
}
