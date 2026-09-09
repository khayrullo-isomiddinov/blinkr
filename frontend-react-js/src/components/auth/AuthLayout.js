import React from 'react';
import Logo from '../layout/Logo';

export default function AuthLayout({ title, children, footer }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-space-base">
      <div className="w-full max-w-md flex flex-col items-center gap-space-lg py-space-2xl">
        <Logo size="lg" />
        <div className="w-full bg-surface-container-low rounded-xl p-space-xl flex flex-col gap-space-lg shadow-md">
          <h1 className="font-headline-md text-headline-md text-on-surface text-center">{title}</h1>
          {children}
        </div>
        {footer && <div className="font-body-sm text-body-sm text-outline text-center">{footer}</div>}
      </div>
    </div>
  );
}
