import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad } from '../../lib/useLoad';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, muscleGroupLine, workoutSummaryLine, startOfWeek, startOfDay, addDays } from '../../lib/calendar';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronLeft, Plus, GripDots, Trash } from '../../components/icons';
import { PRESET_CHIPS, colorForWorkout, tint } from './studioColors';

const DRAG_THRESHOLD = 6; // px of pointer movement before a press becomes a drag, not a tap

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

function activeColor(active) {
  if (active.kind === 'workout') return colorForWorkout(active);
  return (PRESET_CHIPS.find((c) => c.label === active.label) || {}).color || '#FF6B35';
}

export default function WeekStudioPage() {
  const navigate = useNavigate();
  const plan = useLoad('/api/plan', { cache: true });
  const workouts = (plan.data && plan.data.plan && plan.data.plan.workouts) || [];
  const byWeekday = Object.fromEntries(workouts.map((w) => [w.weekday, w]));
  const monday = React.useMemo(() => startOfWeek(new Date()), []);
  const today = React.useMemo(() => startOfDay(new Date()), []);

  // `active` only exists while a real drag is in flight -- a plain tap opens a page instead of "picking up".
  const [active, setActive] = React.useState(null); // { kind: 'workout', id, weekday, name } | { kind: 'chip', label }
  const [listening, setListening] = React.useState(false); // a press is down; may or may not turn into a drag
  const [isDragging, setIsDragging] = React.useState(false); // the press crossed the drag threshold
  const [dragOverDay, setDragOverDay] = React.useState(null);
  const [overTrash, setOverTrash] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const gesture = React.useRef(null); // { item, tapFn, startX, startY, lastX, lastY, dragging }
  const previewRef = React.useRef(null);
  const lastDayRef = React.useRef(null);
  const lastTrashRef = React.useRef(false);

  async function moveOrCreate(item, toDay, occupant) {
    setBusy(true);
    setError('');
    try {
      if (occupant) await apiRequest(`/api/plan/workouts/${occupant.id}`, { method: 'DELETE' });
      if (item.kind === 'workout') {
        await apiRequest(`/api/plan/workouts/${item.id}`, { method: 'PATCH', body: { weekday: toDay } });
      } else {
        await apiRequest('/api/plan/workouts', { method: 'POST', body: { weekday: toDay, name: item.label, exercises: [] } });
      }
      plan.reload();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
      setActive(null);
    }
  }

  async function removeWorkout(workout) {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/api/plan/workouts/${workout.id}`, { method: 'DELETE' });
      plan.reload();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
      setActive(null);
    }
  }

  function attemptPlace(toDay, item) {
    if (!item || busy) return;
    const occupant = byWeekday[toDay];
    if (item.kind === 'workout' && toDay === item.weekday) {
      setActive(null);
      return;
    }
    moveOrCreate(item, toDay, occupant);
  }

  // A press that starts on a draggable source (a placed workout, or a quick-add chip). Stays a "tap" until the
  // pointer moves past the threshold, at which point it becomes a real, finger/cursor-following drag.
  function beginGesture(item, tapFn, e) {
    if (busy) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    gesture.current = { item, tapFn, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, dragging: false };
    lastDayRef.current = null;
    lastTrashRef.current = false;
    setListening(true);
  }

  React.useEffect(() => {
    if (!listening) return undefined;

    function onMove(e) {
      const g = gesture.current;
      if (!g) return;
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      if (!g.dragging) {
        if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD) return;
        g.dragging = true;
        setActive(g.item);
        setIsDragging(true);
      }
      if (previewRef.current) {
        previewRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const dayEl = el && el.closest('[data-day]');
      const trashEl = el && el.closest('[data-trash]');
      const day = dayEl ? Number(dayEl.dataset.day) : null;
      const trash = Boolean(trashEl);
      if (day !== lastDayRef.current) { lastDayRef.current = day; setDragOverDay(day); }
      if (trash !== lastTrashRef.current) { lastTrashRef.current = trash; setOverTrash(trash); }
    }

    function onUp() {
      const g = gesture.current;
      gesture.current = null;
      setListening(false);
      setIsDragging(false);
      const day = lastDayRef.current;
      const trash = lastTrashRef.current;
      setDragOverDay(null);
      setOverTrash(false);
      if (!g) return;
      if (g.dragging) {
        if (trash && g.item.kind === 'workout') removeWorkout(g.item);
        else if (day != null) attemptPlace(day, g.item);
        else setActive(null);
      } else {
        g.tapFn();
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  if (plan.status === 'loading') return <div className="mx-auto max-w-2xl p-4"><Loading label="Loading your week" /></div>;
  if (plan.status === 'error') return <div className="p-4"><LoadError error={plan.error} onRetry={plan.reload} /></div>;

  const balance = weekBalance(workouts);

  return (
    <div className="mx-auto w-full max-w-6xl select-none px-4 pb-28 pt-6 sm:pb-12 sm:pt-10 lg:px-12">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-fg-mute hover:no-underline"><ChevronLeft width={16} height={16} />Calendar</Link>
          <p className="eyebrow mt-4">Week studio</p>
          <h1 className="mt-1.5 font-display text-[38px] font-extrabold leading-none tracking-tight">Your week</h1>
        </div>
        <Link to="/calendar" className="btn-outline">Done</Link>
      </div>

      {error && <div role="alert" className="alert-error mt-5">{error}</div>}

      <section aria-label="Week board" className="mt-8">
        <ol className="grid grid-cols-1 gap-2.5 lg:grid-cols-7">
          {WEEKDAY_SHORT.map((short, day) => {
            const workout = byWeekday[day];
            const date = addDays(monday, day);
            const isToday = date.getTime() === today.getTime();
            const isOrigin = active && active.kind === 'workout' && active.id === workout?.id;
            const hovering = dragOverDay === day && !isOrigin;
            const showAsTarget = active && !isOrigin;
            const willReplace = showAsTarget && Boolean(workout);
            const tap = () => navigate(`/plan/workouts/${workout?.id}`);

            return (
              <li key={day} className="lg:h-full">
                <div className="mb-1.5 flex items-baseline justify-between px-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-mute">
                    {short}<span className="sr-only"> ({WEEKDAY_NAMES[day]})</span>
                  </p>
                  <span className={`flex items-center gap-1 font-display text-[13px] font-bold ${isToday ? 'text-accent' : 'text-fg-mute'}`}>
                    {isToday && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    {date.getDate()}
                  </span>
                </div>

                {workout ? (
                  <div
                    data-day={day}
                    className={`relative flex flex-col rounded-lg border p-3 motion-safe:transition-[shadow,opacity] motion-safe:duration-200 lg:h-[252px] ${isOrigin && isDragging ? 'opacity-40' : ''} ${isToday ? 'ring-1 ring-accent/50' : ''}`}
                    style={{
                      background: tint(colorForWorkout(workout), 0.11),
                      borderColor: isOrigin ? 'transparent' : willReplace ? undefined : tint(colorForWorkout(workout), 0.4),
                      boxShadow: [
                        `inset 0 3px 0 0 ${colorForWorkout(workout)}`,
                        hovering ? '0 0 0 2px rgb(var(--accent))' : null,
                      ].filter(Boolean).join(', '),
                    }}
                  >
                    <button
                      type="button"
                      onPointerDown={(e) => beginGesture({ kind: 'workout', id: workout.id, weekday: day, name: workout.name }, tap, e)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } }}
                      className="touch-none flex-1 rounded-lg text-left outline-none"
                    >
                      <span className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-fg-mute">
                          <GripDots />
                          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: colorForWorkout(workout) }} />
                        </span>
                        {willReplace && (
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">Replace</span>
                        )}
                      </span>
                      <span className="mt-3 block font-display text-[21px] font-extrabold leading-tight tracking-tight text-fg">{workout.name}</span>
                      {workout.exercises.length > 0 && (
                        <span className="mt-1 block truncate text-[13px] text-fg-soft">{muscleGroupLine(workout.exercises)}</span>
                      )}
                      <span className="mt-1.5 block text-xs text-fg-mute">{workoutSummaryLine(workout.exercises, { withEstimate: false })}</span>
                    </button>
                  </div>
                ) : (
                  <div
                    data-day={day}
                    className={`relative rounded-xl border-2 motion-safe:transition-colors motion-safe:duration-200 lg:h-[252px] ${hovering ? 'border-accent bg-accent/10' : showAsTarget ? 'border-dashed border-accent/60' : isToday ? 'border-dashed border-accent/40' : 'border-dashed border-ink-800'}`}
                  >
                    {active ? (
                      <button type="button" onClick={() => attemptPlace(day, active)} className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl text-center lg:h-full">
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
              const tap = () => navigate(`/plan/workouts/new?name=${encodeURIComponent(chip.label)}`);
              return (
                <button
                  key={chip.label}
                  type="button"
                  onPointerDown={(e) => beginGesture({ kind: 'chip', label: chip.label }, tap, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } }}
                  className="touch-none flex w-full items-center gap-3 border-t border-ink-700 bg-ink-900 px-3.5 py-3 text-left first:border-t-0 hover:bg-ink-800"
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

      {isDragging && active && active.kind === 'workout' && (
        <div
          data-trash
          className={`fixed inset-x-0 bottom-24 z-40 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-2xl transition-transform motion-safe:animate-[fade-in_140ms_ease-out] motion-safe:duration-150 sm:bottom-10 ${overTrash ? 'scale-125 border-red-500 bg-red-500/20 text-red-400' : 'border-chrome-line bg-chrome text-chrome-mute'}`}
        >
          <Trash width={24} height={24} />
        </div>
      )}

      {isDragging && active && (
        <div
          ref={previewRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 max-w-[220px] truncate rounded-lg px-3.5 py-2.5 font-display text-sm font-bold text-fg shadow-2xl motion-safe:animate-[fade-in_140ms_ease-out]"
          style={{
            background: tint(activeColor(active), 0.9),
            border: `1px solid ${activeColor(active)}`,
            transform: `translate3d(${gesture.current ? gesture.current.lastX : 0}px, ${gesture.current ? gesture.current.lastY : 0}px, 0) translate(-50%, -50%)`,
          }}
        >
          {activeLabel(active)}
        </div>
      )}
    </div>
  );
}
