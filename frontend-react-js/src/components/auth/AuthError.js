import React from 'react';

export default function AuthError({ children }) {
  if (!children) return null;
  return (
    <div className="bg-error-container/20 border border-error/30 text-error rounded-lg px-space-md py-space-sm font-body-sm text-body-sm">
      {children}
    </div>
  );
}
