import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLoad } from '../../lib/useLoad';
import {
  WEEKDAY_NAMES, addDays, dateKey, dayState, estimateMinutes, formatTarget, longDate, parseDateKey, startOfDay, startOfWeek, weekdayOf,
} from '../../lib/calendar';
import { formatClock, formatDuration } from '../../lib/format';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronLeft, ChevronRight, Plus } from '../../components/icons';
import DayStatus from './DayStatus';
import DuplicatePicker from './DuplicatePicker';
import { useStartPlanned } from './useStartPlanned';

export default function DayPage() {
  const { date: key } = useParams();
  const date = parseDateKey(key);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const plan = useLoad('/api/plan');
  const range = date ? `from=${encodeURIComponent(date.toISOString())}&to=${encodeURIComponent(addDays(date, 1).toISOString())}` : '';
  const sessions = useLoad(date ? `/api/workout-sessions?${range}` : '/api/workout-sessions?from=1970-01-01T00:00:00Z&to=1970-01-01T00:00:01Z');
  const { start, busyId, error: startError } = useStartPlanned();

  if (!date) {
    return (
      <div className="card m-4 max-w-lg p-6">
        <p className="mb-3 text-sm text-fg-soft">That date is not valid.</p>
        <Link to="/calendar">Back to calendar</Link>
      </div>
    );
  }

  const weekday = weekdayOf(date);
  const back = `/calendar?week=${dateKey(startOfWeek(date))}`;
  const workouts = (plan.data && plan.data.plan && plan.data.plan.workouts) || [];
  const planned = workouts.find((w) => w.weekday === weekday) || null;
  const state = dayState({ planned, sessions: sessions.data || [], date, today: startOfDay(new Date()) });
  const { status, session, extras } = state;
  const minutes = planned ? estimateMinutes(planned.exercises) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6 sm:pb-12 sm:pt-10">
      <Link to={back} className="inline-flex items-center gap-1 text-sm text-fg-mute hover:no-underline"><ChevronLeft width={16} height={16} />Calendar</Link>

      {(plan.status === 'loading' || sessions.status === 'loading') && <div className="mt-6"><Loading label="Loading the day" /></div>}
      {plan.status === 'error' && <div className="mt-6"><LoadError error={plan.error} onRetry={plan.reload} /></div>}
      {plan.status === 'ready' && sessions.status === 'error' && <div className="mt-6"><LoadError error={sessions.error} onRetry={sessions.reload} /></div>}

      {plan.status === 'ready' && sessions.status === 'ready' && (
        <>
          <p className="eyebrow mt-5">{WEEKDAY_NAMES[weekday]}</p>
          <h1 className="mt-1 font-display text-[34px] font-extrabold leading-tight tracking-tight">{longDate(date)}</h1>
          <div className="mt-2"><DayStatus status={status} /></div>
          {startError && <div role="alert" className="alert-error mt-4">{startError}</div>}

          {planned ? (
            <section aria-label={planned.name} className="mt-6">
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">{planned.name}</h2>
              <p className="mt-1 text-sm text-fg-mute">
                {planned.exercises.length} {planned.exercises.length === 1 ? 'exercise' : 'exercises'}{minutes ? ` · Estimated ~${minutes} min` : ''}
              </p>

              {planned.exercises.length === 0 ? (
                <p className="card mt-5 p-4 text-sm text-fg-mute">No exercises yet. <Link to={`/plan/workouts/${planned.id}`}>Add some</Link>.</p>
              ) : (
                <ol className="mt-5">
                  {planned.exercises.map((exercise) => (
                    <li key={exercise.id} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-2 border-t border-ink-700 py-3.5">
                      <span className="text-sm text-fg-mute">{exercise.exercise_order}</span>
                      <span className="font-display text-lg font-bold">{exercise.exercise_name}</span>
                      <span className="font-display text-base font-bold tabular-nums text-fg-soft">{formatTarget(exercise)}</span>
                    </li>
                  ))}
                  <li className="border-t border-ink-700" />
                </ol>
              )}

              <div className="mt-5 flex flex-wrap gap-2.5">
                {(status === 'planned' || status === 'missed') && (
                  <button type="button" onClick={() => start(planned.id)} disabled={busyId === planned.id} className="btn-primary h-12 px-6 text-base">
                    {busyId === planned.id ? 'Starting...' : 'Start workout'}
                  </button>
                )}
                {status === 'in_progress' && <Link to={`/workouts/${session.id}`} className="btn-primary h-12 px-6 text-base text-accent-ink hover:text-accent-ink">Continue workout</Link>}
                {status === 'completed' && <Link to={`/workouts/${session.id}`} className="btn-secondary h-12 px-6 text-base text-fg hover:text-fg">View workout</Link>}
                <Link to={`/plan/workouts/${planned.id}`} className="btn-secondary h-12 text-fg hover:text-fg">Edit workout</Link>
                <button type="button" onClick={() => setCopyOpen((v) => !v)} aria-expanded={copyOpen} className="btn-secondary h-12">Copy to another day</button>
              </div>
              {copyOpen && (
                <div className="card mt-4 p-4">
                  <DuplicatePicker workout={planned} planWorkouts={workouts} onCopied={plan.reload} />
                </div>
              )}
            </section>
          ) : (
            <section aria-label="Rest day" className="card mt-6 p-6">
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">Rest day</h2>
              <p className="mt-2 text-sm text-fg-mute">Nothing is planned for {WEEKDAY_NAMES[weekday]}.</p>
              <Link to={`/plan/workouts/new?weekday=${weekday}`} className="btn-primary mt-5 text-accent-ink hover:text-accent-ink"><Plus width={18} height={18} />Add workout</Link>
            </section>
          )}

          {extras.length > 0 && (
            <section aria-label="Other workouts" className="mt-8">
              <h2 className="eyebrow mb-2">{planned ? 'Other workouts this day' : 'Workouts this day'}</h2>
              <ul className="card overflow-hidden">
                {extras.map((s) => (
                  <li key={s.id} className="border-t border-ink-700 first:border-t-0">
                    <Link to={`/workouts/${s.id}`} className="grid min-h-[60px] grid-cols-[1fr_auto_1.25rem] items-center gap-3 px-4 text-fg hover:bg-ink-800 hover:no-underline">
                      <span className="font-display text-base font-bold">{s.plan_name || 'Workout'} <span className="font-sans text-sm font-normal text-fg-mute">· Started {formatClock(s.started_at)}</span></span>
                      <span className={`font-display text-sm font-bold ${s.completed_at ? 'text-fg-soft' : 'text-accent'}`}>{s.completed_at ? formatDuration(s.started_at, s.completed_at) : 'In progress'}</span>
                      <ChevronRight width={18} height={18} className="text-fg-mute" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
