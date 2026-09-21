import React from 'react';
import { describeApiError } from '../lib/apiErrors';
import { cardClass, secondaryButton } from '../lib/ui';

export function Loading({ label = 'Loading' }) {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-3">
      <span className="sr-only">{label}</span>
      <div className="h-16 rounded-lg bg-gray-900 border border-gray-800" />
      <div className="h-16 rounded-lg bg-gray-900 border border-gray-800" />
    </div>
  );
}

export function LoadError({ error, onRetry }) {
  return (
    <div role="alert" className={`${cardClass} p-5 max-w-lg`}>
      <p className="text-sm text-gray-300 mb-3">{describeApiError(error)}</p>
      <button type="button" onClick={onRetry} className={secondaryButton}>Try again</button>
    </div>
  );
}
