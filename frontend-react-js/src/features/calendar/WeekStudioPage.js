import React from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad, refreshLoad } from '../../lib/useLoad';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, muscleGroupLine, workoutSummaryLine } from '../../lib/calendar';
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

function activeLabel(active) {
  return active.kind === 'workout' ? active.name : active.label;
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
  const verb = active && active.kind === 'workout' ? (mode === 'move' ? 'Move' : 'Copy') : 'Add';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:pb-12 sm:pt-10 lg:px-12">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-fg-mute hover:no-underline"><ChevronLeft width={16} height={16} />Calendar</Link>
          <p className="eyebrow mt-4">Week studio</p>
          <h1 className="mt-1.5 font-display text-[38px] font-extrabold leading-none tracking-tight">Your week</h1>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <div role="group" aria-label="Placement mode" className="grid grid-cols-2 gap-1 rounded-lg bg-ink-900 p-1">
            {[['move', 'Move'], ['copy', 'Copy']].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setPendingConfirm(null); }} className="seg-btn w-[76px]">{label}</button>
            ))}
          </div>
          <Link to="/calendar" className="btn-outline">Done</Link>
        </div>
      </div>

      {active && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="font-display text-lg font-bold text-accent">{verb} "{activeLabel(active)}" <span className="text-fg-mute">→</span> choose a day</p>
          <button type="button" onClick={() => setActive(null)} className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-fg-mute hover:bg-ink-800 hover:text-fg">
            <Close width={13} height={13} />Cancel
          </button>
        </div>
      )}

      {error && <div role="alert" className="alert-error mt-5">{error}</div>}

      {pendingConfirm && (
        <div role="alertdialog" aria-label="Confirm replace" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4">
          <p className="text-sm text-fg-soft">
            Replace <strong className="font-semibold text-fg">{pendingConfirm.occupant.name}</strong> with{' '}
            <strong className="font-semibold text-fg">{pendingConfirm.sourceLabel}</strong> on {WEEKDAY_NAMES[pendingConfirm.toDay]}?
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={confirmPending} disabled={busy} className="btn-primary h-10 min-h-0 text-accent-ink hover:text-accent-ink">{busy ? 'Replacing...' : 'Replace'}</button>
            <button type="button" onClick={() => setPendingConfirm(null)} disabled={busy} className="btn-secondary h-10 min-h-0">Cancel</button>
          </div>
        </div>
      )}

      <section aria-label="Week board" className="mt-8">
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
                <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-mute">
                  {short}<span className="sr-only"> ({WEEKDAY_NAMES[day]})</span>
                </p>

                {workout ? (
                  <div
                    className={`relative flex flex-col rounded-lg border p-3 motion-safe:transition-shadow lg:h-[252px] ${hovering ? 'ring-2 ring-accent' : ''}`}
                    style={{
                      background: tint(colorForWorkout(workout), 0.11),
                      borderColor: isOrigin ? 'transparent' : willReplace ? undefined : tint(colorForWorkout(workout), 0.4),
                      boxShadow: `inset 0 3px 0 0 ${colorForWorkout(workout)}`,
                    }}
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
                      className={`flex-1 rounded-lg text-left outline-none disabled:cursor-not-allowed ${isOrigin ? 'ring-2 ring-accent' : ''} ${willReplace ? 'ring-2 ring-accent/70' : ''}`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-fg-mute">
                          <GripDots />
                          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: colorForWorkout(workout) }} />
                        </span>
                        {(isOrigin || willReplace) && (
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{isOrigin ? 'Picked up' : 'Replace'}</span>
                        )}
                      </span>
                      <span className="mt-3 block font-display text-[21px] font-extrabold leading-tight tracking-tight text-fg">{workout.name}</span>
                      {workout.exercises.length > 0 && (
                        <span className="mt-1 block truncate text-[13px] text-fg-soft">{muscleGroupLine(workout.exercises)}</span>
                      )}
                      <span className="mt-1.5 block text-xs text-fg-mute">{workoutSummaryLine(workout.exercises, { withEstimate: false })}</span>
                    </button>
                    <Link to={`/plan/workouts/${workout.id}`} className="mt-2.5 text-[13px] font-semibold text-fg-soft hover:text-fg">Edit workout</Link>
                  </div>
                ) : (
                  <div
                    className={`relative rounded-xl lg:h-[252px] ${hovering ? 'border-2 border-accent bg-accent/10' : showAsTarget ? 'border-2 border-dashed border-accent/60' : 'border border-dashed border-ink-800'}`}
                    onDragOver={(e) => { if (!dragBlocked(day)) { e.preventDefault(); setDragOverDay(day); } }}
                    onDragLeave={() => setDragOverDay((d) => (d === day ? null : d))}
                    onDrop={(e) => { e.preventDefault(); setDragOverDay(null); attemptPlace(day); }}
                  >
                    {active ? (
                      <button type="button" onClick={() => attemptPlace(day)} disabled={disabledAll} className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl text-center disabled:cursor-not-allowed lg:h-full">
                        <span className="font-display text-lg font-bold text-accent">{hovering ? 'Release to place' : 'Place here'}</span>
                        <span className="text-xs text-fg-mute">{activeLabel(active)}</span>
                      </button>
                    ) : (
                      <Link to={`/plan/workouts/new?weekday=${day}`} className="group flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl text-center hover:bg-accent/5 hover:no-underline lg:h-full">
                        <span className="font-display text-lg font-bold text-fg-mute group-hover:text-accent">Rest</span>
                        <span className="text-xs text-fg-mute group-hover:text-accent">+ Add workout</span>
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="Quick add and week balance" className="mt-10 grid gap-8 border-t border-ink-800 pt-7 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow">Quick add</p>
          <div className="mt-3.5 overflow-hidden rounded-lg border border-ink-700">
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
                  className={`flex w-full items-center gap-3 border-t border-ink-700 px-3.5 py-3 text-left first:border-t-0 disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-accent/10' : 'bg-ink-900 hover:bg-ink-800'}`}
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: chip.color }} />
                  <span className="flex-1 font-display text-[15px] font-bold text-fg">{chip.label}</span>
                  <Plus width={16} height={16} className="flex-none text-fg-mute" />
                </button>
              );
            })}
            <Link to="/plan/workouts/new" className="flex w-full items-center gap-3 border-t border-ink-700 px-3.5 py-3 text-left text-fg-soft hover:bg-ink-800 hover:no-underline">
              <Plus width={16} height={16} className="flex-none" />
              <span className="text-[15px] font-semibold">Custom workout</span>
            </Link>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="eyebrow">Week balance</p>
            {balance.totalSets > 0 && <p className="text-xs text-fg-mute">{balance.totalSets} sets</p>}
          </div>
          {balance.bars.length === 0 ? (
            <p className="mt-3 text-sm text-fg-mute">Add exercises to see the split by muscle group.</p>
          ) : (
            <div className="mt-3.5 flex flex-col gap-2">
              {balance.bars.map((bar) => (
                <div key={bar.group} className="grid grid-cols-[5rem_1fr_1.5rem] items-center gap-2.5 text-[13px] text-fg-soft">
                  <span className="truncate">{bar.group}</span>
                  <span className="h-1.5 rounded-sm bg-ink-800"><span className="block h-1.5 rounded-sm bg-accent" style={{ width: `${bar.pct}%` }} /></span>
                  <span className="text-right font-display font-bold text-fg">{bar.sets}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Toast toast={toast} busy={busy} onUndo={() => toast && toast.undo()} onDismiss={dismissToast} />
    </div>
  );
}
