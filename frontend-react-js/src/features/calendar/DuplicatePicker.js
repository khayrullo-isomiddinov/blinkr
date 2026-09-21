import React from 'react';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { WEEKDAY_SHORT, WEEKDAY_NAMES } from '../../lib/calendar';

// Copy a planned workout (with its exercises and targets) onto another weekday. Two taps: pick the day, confirm.
export default function DuplicatePicker({ workout, planWorkouts, onCopied }) {
  const [pending, setPending] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState('');
  const byWeekday = Object.fromEntries(planWorkouts.map((w) => [w.weekday, w]));
  const occupant = pending != null ? byWeekday[pending] : null;

  async function copy() {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/api/plan/workouts/${workout.id}/duplicate`, { method: 'POST', body: { weekday: pending, replace: Boolean(occupant) } });
      setDone(`Copied to ${WEEKDAY_NAMES[pending]}.`);
      setPending(null);
      onCopied();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="field-label">Copy to another day</p>
      <div role="group" aria-label="Copy to day" className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_SHORT.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={pending === index}
            disabled={index === workout.weekday || busy}
            onClick={() => { setPending(index); setDone(''); setError(''); }}
            className="seg-btn disabled:opacity-30"
          >
            {label}
            {byWeekday[index] && index !== workout.weekday && <span className="block text-[9px] leading-none opacity-70">•</span>}
          </button>
        ))}
      </div>
      {pending != null && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-fg-soft">
            Copy {workout.name} to {WEEKDAY_NAMES[pending]}?{occupant ? ` This replaces ${occupant.name}.` : ''}
          </p>
          <button type="button" onClick={copy} disabled={busy} className="btn-primary h-10 min-h-0">{busy ? 'Copying...' : 'Copy'}</button>
          <button type="button" onClick={() => setPending(null)} disabled={busy} className="btn-secondary h-10 min-h-0">Cancel</button>
        </div>
      )}
      {done && <p role="status" className="mt-3 text-sm text-fg-mute">{done}</p>}
      {error && <div role="alert" className="alert-error mt-3">{error}</div>}
    </div>
  );
}
