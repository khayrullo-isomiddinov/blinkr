import React from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad, refreshLoad } from '../../lib/useLoad';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, estimateMinutes } from '../../lib/calendar';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronLeft, Plus, GripDots, Undo, Close } from '../../components/icons';
import { PRESET_CHIPS, colorForWorkout, tint } from './studioColors';

// The fields a planned workout's exercises come back with from GET /api/plan -- the same shape POST /api/plan/workouts expects.
const exerciseInput = (e) => ({
  exercise_id: e.exercise_id,
  target_sets: e.target_sets,
  target_reps_min: e.target_reps_min,
  target_reps_max: e.target_reps_max,
  target_weight: e.target_weight,
  target_weight_unit: e.target_weight_unit,
  notes: e.notes,
});

function weekBalance(workouts) {
  let totalSets = 0;
  const perGroup = {};
  workouts.forEach((w) => w.exercises.forEach((e) => {
    const sets = e.target_sets || 0;
    totalSets += sets;
    const group = e.exercise_muscle_group || 'other';
    perGroup[group] = (perGroup[group] || 0) + sets;
  }));
  const bars = Object.entries(perGroup).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = bars.length ? bars[0][1] : 1;
  return {
    totalSets,
    bars: bars.map(([group, sets]) => ({ group: group.charAt(0).toUpperCase() + group.slice(1), sets, pct: Math.round((sets / max) * 100) })),
  };
}

function ModeToggle({ mode, onChange }) {
  return (
    <div role="group" aria-label="Placement mode" className="grid grid-cols-2 gap-1 rounded-lg bg-ink-950 p-1">
      {[['move', 'Move'], ['copy', 'Copy']].map(([value, label]) => (
        <button key={value} type="button" aria-pressed={mode === value} onClick={() => onChange(value)} className="seg-btn w-[84px]">{label}</button>
      ))}
    </div>
  );
}

function Toast({ toast, busy, onUndo, onDismiss }) {
  if (!toast) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-20 z-40 flex justify-center sm:bottom-6">
      <div className="flex max-w-full items-center gap-3 rounded-full bg-chrome py-2.5 pl-5 pr-2.5 text-sm font-medium text-chrome-fg shadow-2xl">
        <span className="truncate">{toast.message}</span>
        {toast.undo && (
          <button type="button" onClick={onUndo} disabled={busy} className="flex-none rounded-full bg-chrome-raised px-3.5 py-1.5 text-[13px] font-semibold text-chrome-fg hover:bg-chrome-line disabled:opacity-50">
            <span className="inline-flex items-center gap-1.5"><Undo width={14} height={14} />Undo</span>
          </button>
        )}
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-chrome-mute hover:bg-chrome-raised hover:text-chrome-fg">
          <Close width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

export default function WeekStudioPage() {
  const plan = useLoad('/api/plan', { cache: true });
  const workouts = (plan.data && plan.data.plan && plan.data.plan.workouts) || [];
  const byWeekday = Object.fromEntries(workouts.map((w) => [w.weekday, w]));

  const [mode, setMode] = React.useState('move');
  const [active, setActive] = React.useState(null); // { kind: 'workout', id, weekday, name } | { kind: 'chip', label }
  const [dragOverDay, setDragOverDay] = React.useState(null);
  const [pendingConfirm, setPendingConfirm] = React.useState(null); // { kind, toDay, occupant, sourceLabel }
  const [toast, setToast] = React.useState(null); // { message, undo }
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const toastTimer = React.useRef(null);

  React.useEffect(() => () => clearTimeout(toastTimer.current), []);

  function showToast(message, undo) {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }
  function dismissToast() {
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  function pick(item, matches) {
    if (busy || pendingConfirm) return;
    setActive((current) => (current && matches(current) ? null : item));
  }

  // Recreates a workout that was just replaced -- new id, same name/notes/exercises, on the day it used to hold.
  async function restoreOccupant(occupant) {
    await apiRequest('/api/plan/workouts', {
      method: 'POST',
      body: { weekday: occupant.weekday, name: occupant.name, notes: occupant.notes, exercises: occupant.exercises.map(exerciseInput) },
    });
  }

  async function moveWorkout(workout, toDay) {
    await apiRequest(`/api/plan/workouts/${workout.id}`, { method: 'PATCH', body: { weekday: toDay } });
    return {
      message: `Moved ${workout.name} to ${WEEKDAY_NAMES[toDay]}`,
      undo: async () => apiRequest(`/api/plan/workouts/${workout.id}`, { method: 'PATCH', body: { weekday: workout.weekday } }),
    };
  }

  async function copyWorkout(workout, toDay, occupant) {
    const copy = await apiRequest(`/api/plan/workouts/${workout.id}/duplicate`, { method: 'POST', body: { weekday: toDay, replace: Boolean(occupant) } });
    return {
      message: occupant ? `Replaced ${occupant.name} with a copy of ${workout.name}` : `Copied ${workout.name} to ${WEEKDAY_NAMES[toDay]}`,
      undo: async () => {
        await apiRequest(`/api/plan/workouts/${copy.id}`, { method: 'DELETE' });
        if (occupant) await restoreOccupant(occupant);
      },
    };
  }

  async function createWorkout(label, toDay, occupant) {
    if (occupant) await apiRequest(`/api/plan/workouts/${occupant.id}`, { method: 'DELETE' });
    const created = await apiRequest('/api/plan/workouts', { method: 'POST', body: { weekday: toDay, name: label, exercises: [] } });
    return {
      message: occupant ? `Replaced ${occupant.name} with ${label}` : `Added ${label} on ${WEEKDAY_NAMES[toDay]}`,
      undo: async () => {
        await apiRequest(`/api/plan/workouts/${created.id}`, { method: 'DELETE' });
        if (occupant) await restoreOccupant(occupant);
      },
    };
  }

  async function run(kind, toDay, occupant, currentActive) {
    setBusy(true);
    setError('');
    try {
      let result;
      if (kind === 'workout-move') result = await moveWorkout(currentActive, toDay);
      else if (kind === 'workout-copy') result = await copyWorkout(currentActive, toDay, occupant);
      else result = await createWorkout(currentActive.label, toDay, occupant);

      await refreshLoad('/api/plan').catch(() => {});
      showToast(result.message, () => {
        setBusy(true);
        result.undo()
          .then(() => refreshLoad('/api/plan').catch(() => {}))
          .then(dismissToast)
          .catch((err) => setError(describeApiError(err)))
          .finally(() => setBusy(false));
      });
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
      setActive(null);
      setPendingConfirm(null);
    }
  }

  function attemptPlace(toDay) {
    if (!active || busy || pendingConfirm) return;
    const occupant = byWeekday[toDay];

    if (active.kind === 'workout') {
      if (toDay === active.weekday) {
        setActive(null);
        return;
      }
      if (occupant && mode === 'move') {
        showToast(`${WEEKDAY_NAMES[toDay]} already has ${occupant.name}. Switch to Copy to replace it, or move ${occupant.name} first.`, null);
        setActive(null);
        return;
      }
      const kind = mode === 'move' ? 'workout-move' : 'workout-copy';
      if (occupant) setPendingConfirm({ kind, toDay, occupant, sourceLabel: active.name });
      else run(kind, toDay, null, active);
      return;
    }

    if (occupant) setPendingConfirm({ kind: 'create', toDay, occupant, sourceLabel: active.label });
    else run('create', toDay, null, active);
  }

  function confirmPending() {
    if (!pendingConfirm) return;
    run(pendingConfirm.kind, pendingConfirm.toDay, pendingConfirm.occupant, active);
  }

  const dragBlocked = (day) => {
    if (!active) return true;
    const occupant = byWeekday[day];
    return Boolean(occupant) && active.kind === 'workout' && mode === 'move' && occupant.id !== active.id;
  };

  if (plan.status === 'loading') return <div className="mx-auto max-w-2xl p-4"><Loading label="Loading your week" /></div>;
  if (plan.status === 'error') return <div className="p-4"><LoadError error={plan.error} onRetry={plan.reload} /></div>;

  const balance = weekBalance(workouts);
  const restDays = 7 - workouts.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:pb-12 sm:pt-10 lg:px-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-fg-mute hover:no-underline"><ChevronLeft width={16} height={16} />Calendar</Link>
          <p className="eyebrow mt-4">Week studio</p>
          <h1 className="mt-1.5 font-display text-[38px] font-extrabold leading-none tracking-tight">Organize your week</h1>
          <p className="mt-2 max-w-sm text-sm text-fg-mute">
            {active
              ? `${active.kind === 'workout' ? active.name : active.label} picked up. Tap or drop it on a day.`
              : 'Pick up a workout or a quick-add color, then place it on a day. This repeats every week.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle mode={mode} onChange={(m) => { setMode(m); setPendingConfirm(null); }} />
          <Link to="/calendar" className="btn-outline">Done</Link>
        </div>
      </div>

      {error && <div role="alert" className="alert-error mt-5">{error}</div>}

      {pendingConfirm && (
        <div role="alertdialog" aria-label="Confirm replace" className="card mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-fg-soft">
            Replace <strong className="font-semibold text-fg">{pendingConfirm.occupant.name}</strong> on {WEEKDAY_NAMES[pendingConfirm.toDay]} with{' '}
            <strong className="font-semibold text-fg">{pendingConfirm.sourceLabel}</strong>?
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={confirmPending} disabled={busy} className="btn-primary h-10 min-h-0 text-accent-ink hover:text-accent-ink">{busy ? 'Replacing...' : 'Replace'}</button>
            <button type="button" onClick={() => setPendingConfirm(null)} disabled={busy} className="btn-secondary h-10 min-h-0">Cancel</button>
          </div>
        </div>
      )}

      <section aria-label="Week board" className="card mt-6 p-3 sm:p-4">
        <ol className="grid grid-cols-1 gap-2.5 lg:grid-cols-7">
          {WEEKDAY_SHORT.map((short, day) => {
            const workout = byWeekday[day];
            const isOrigin = active && active.kind === 'workout' && active.id === workout?.id;
            const blocked = dragBlocked(day);
            const hovering = dragOverDay === day && !blocked;
            const showAsTarget = active && !isOrigin && !blocked;
            const willReplace = showAsTarget && Boolean(workout);
            const disabledAll = busy || Boolean(pendingConfirm);

            return (
              <li key={day} className="lg:h-full">
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-mute">{WEEKDAY_NAMES[day]}</p>

                {workout ? (
                  <div
                    className={`relative flex flex-col rounded-xl border p-3 lg:h-[300px] ${hovering ? 'ring-2 ring-accent' : ''}`}
                    style={{ background: tint(colorForWorkout(workout), 0.12), borderColor: isOrigin ? 'transparent' : tint(colorForWorkout(workout), 0.45) }}
                    onDragOver={(e) => { if (!dragBlocked(day)) { e.preventDefault(); setDragOverDay(day); } }}
                    onDragLeave={() => setDragOverDay((d) => (d === day ? null : d))}
                    onDrop={(e) => { e.preventDefault(); setDragOverDay(null); attemptPlace(day); }}
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setActive({ kind: 'workout', id: workout.id, weekday: day, name: workout.name })}
                      disabled={disabledAll}
                      onClick={() => (isOrigin ? setActive(null) : active ? attemptPlace(day) : setActive({ kind: 'workout', id: workout.id, weekday: day, name: workout.name }))}
                      aria-pressed={isOrigin}
                      className={`flex-1 rounded-lg text-left outline-none disabled:cursor-not-allowed ${isOrigin ? 'ring-2 ring-accent' : ''} ${willReplace ? 'ring-1 ring-dashed ring-fg-mute' : ''}`}
                    >
                      <span className="flex items-center justify-between text-fg-mute">
                        <span className="inline-flex items-center gap-2">
                          <GripDots />
                          <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: colorForWorkout(workout) }} />
                        </span>
                        <span className="text-xs font-semibold">{isOrigin ? 'Picked up' : willReplace ? 'Replace' : 'Move'}</span>
                      </span>
                      <span className="mt-3.5 block font-display text-[22px] font-extrabold leading-tight tracking-tight text-fg">{workout.name}</span>
                      <span className="mt-1 block text-xs text-fg-mute">
                        {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                        {estimateMinutes(workout.exercises) ? ` · ~${estimateMinutes(workout.exercises)} min` : ''}
                      </span>
                      {workout.exercises.length > 0 && (
                        <span className="mt-3.5 hidden flex-col gap-1 text-[13px] text-fg-soft lg:flex">
                          {workout.exercises.slice(0, 3).map((e) => <span key={e.id} className="truncate">{e.exercise_name}</span>)}
                          {workout.exercises.length > 3 && <span className="text-fg-mute">+{workout.exercises.length - 3} more</span>}
                        </span>
                      )}
                    </button>
                    <Link to={`/plan/workouts/${workout.id}`} className="mt-2.5 text-[13px] font-semibold text-fg-soft hover:text-fg">Edit workout</Link>
                  </div>
                ) : (
                  <div
                    className={`relative rounded-xl border lg:h-[300px] ${hovering ? 'border-accent bg-accent/10' : showAsTarget ? 'border-dashed border-accent/60' : 'border-dashed border-ink-700'}`}
                    onDragOver={(e) => { if (!dragBlocked(day)) { e.preventDefault(); setDragOverDay(day); } }}
                    onDragLeave={() => setDragOverDay((d) => (d === day ? null : d))}
                    onDrop={(e) => { e.preventDefault(); setDragOverDay(null); attemptPlace(day); }}
                  >
                    {active ? (
                      <button type="button" onClick={() => attemptPlace(day)} disabled={disabledAll} className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl text-center disabled:cursor-not-allowed lg:h-full">
                        <span className="font-display text-lg font-bold text-accent">{hovering ? 'Release to place' : 'Place here'}</span>
                        <span className="text-xs text-fg-mute">{active.kind === 'workout' ? active.name : active.label}</span>
                      </button>
                    ) : (
                      <Link to={`/plan/workouts/new?weekday=${day}`} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-center hover:no-underline lg:h-full">
                        <span className="font-display text-lg font-bold text-fg-mute">Rest</span>
                        <span className="text-xs text-fg-mute">+ Add workout</span>
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section aria-label="Quick add" className="card p-4 sm:p-5">
          <p className="eyebrow">Quick add · pick one, then place it on a day</p>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            {PRESET_CHIPS.map((chip) => {
              const isActive = active && active.kind === 'chip' && active.label === chip.label;
              return (
                <button
                  key={chip.label}
                  type="button"
                  draggable
                  onDragStart={() => setActive({ kind: 'chip', label: chip.label })}
                  onClick={() => pick({ kind: 'chip', label: chip.label }, (c) => c.kind === 'chip' && c.label === chip.label)}
                  disabled={busy || Boolean(pendingConfirm)}
                  aria-pressed={isActive}
                  className={`inline-flex h-11 items-center gap-2 rounded-full border px-3.5 font-display text-[15px] font-bold disabled:cursor-not-allowed ${isActive ? 'border-accent bg-ink-800 text-fg' : 'border-ink-700 bg-ink-800 text-fg hover:border-ink-500'}`}
                >
                  <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: chip.color }} />
                  {chip.label}
                </button>
              );
            })}
            <Link to="/plan/workouts/new" className="btn-secondary rounded-full border border-dashed border-ink-600 bg-transparent"><Plus width={16} height={16} />Custom</Link>
          </div>
        </section>

        <section aria-label="Week balance" className="card p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="eyebrow">Week balance</p>
            <p className="text-[13px] text-fg-soft">{workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'} · {restDays} rest · {balance.totalSets} sets</p>
          </div>
          {balance.bars.length === 0 ? (
            <p className="mt-3 text-sm text-fg-mute">Add exercises to a workout to see the split by muscle group.</p>
          ) : (
            <div className="mt-3.5 flex flex-col gap-2">
              {balance.bars.map((bar) => (
                <div key={bar.group} className="grid grid-cols-[5.5rem_1fr_1.75rem] items-center gap-2.5 text-[13px] text-fg-soft">
                  <span className="truncate">{bar.group}</span>
                  <span className="h-2 rounded-full bg-ink-800"><span className="block h-2 rounded-full bg-accent" style={{ width: `${bar.pct}%` }} /></span>
                  <span className="text-right font-display font-bold text-fg">{bar.sets}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Toast toast={toast} busy={busy} onUndo={() => toast && toast.undo()} onDismiss={dismissToast} />
    </div>
  );
}
