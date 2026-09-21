import React from 'react';
import { describeApiError } from '../lib/apiErrors';

export function Loading({ label = 'Loading' }) {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-3">
      <span className="sr-only">{label}</span>
      <div className="h-16 rounded-lg border border-ink-700 bg-ink-900" />
      <div className="h-16 rounded-lg border border-ink-700 bg-ink-900" />
    </div>
  );
}

export function LoadError({ error, onRetry }) {
  return (
    <div role="alert" className="card max-w-lg p-5">
      <p className="mb-3 text-sm text-fg-soft">{describeApiError(error)}</p>
      <button type="button" onClick={onRetry} className="btn-secondary">Try again</button>
    </div>
  );
}
