import React from 'react';
import { Link } from 'react-router-dom';
import { useLoad } from '../../lib/useLoad';
import { formatDay, formatDuration, formatClock } from '../../lib/format';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronRight, Plus } from '../../components/icons';
import { useStartWorkout } from './useStartWorkout';

// The API returns newest first, so grouping keeps that order.
function groupByMonth(sessions) {
  const groups = [];
  sessions.forEach((session) => {
    const date = new Date(session.started_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleDateString([], { month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(session);
    else groups.push({ key, label, items: [session] });
  });
  return groups;
}

function WorkoutRow({ session }) {
  const active = !session.completed_at;
  return (
    <li className="border-t border-ink-950 first:border-t-0">
      <Link
        to={`/workouts/${session.id}`}
        className="grid min-h-[72px] grid-cols-[1fr_auto_1.25rem] items-center gap-3 px-4 text-fg hover:bg-ink-800 hover:no-underline"
      >
        <span>
          <span className="block font-display text-lg font-bold">{formatDay(session.started_at)}</span>
          <span className="mt-0.5 block text-[13px] text-fg-mute">{session.plan_name ? `${session.plan_name} · ` : ''}Started {formatClock(session.started_at)}</span>
        </span>
        <span className={`font-display text-base font-bold ${active ? 'text-accent' : 'text-fg'}`}>
          {active ? 'In progress' : formatDuration(session.started_at, session.completed_at)}
        </span>
        <ChevronRight width={18} height={18} className="text-fg-mute" />
      </Link>
    </li>
  );
}

export default function WorkoutsPage() {
  const { status, data, error, reload } = useLoad('/api/workout-sessions');
  const { start, starting, error: startError } = useStartWorkout();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-6 sm:pt-10">
      <h1 className="font-display text-[38px] font-extrabold leading-none tracking-tight">Workouts</h1>
      <button type="button" onClick={start} disabled={starting} className="btn-primary mt-5 h-[60px] w-full text-xl sm:hidden">
        <Plus width={22} height={22} />
        {starting ? 'Starting...' : 'Start workout'}
      </button>
      {startError && <div role="alert" className="alert-error mt-4">{startError}</div>}

      <div className="mt-8">
        {status === 'loading' && <Loading label="Loading workouts" />}
        {status === 'error' && <LoadError error={error} onRetry={reload} />}
        {status === 'ready' && data.length === 0 && (
          <p className="card p-6 text-sm text-fg-mute">No workouts yet. Start your first one.</p>
        )}
        {status === 'ready' && groupByMonth(data).map((group) => (
          <section key={group.key} aria-label={group.label} className="mb-7">
            <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wider text-fg-mute">{group.label}</h2>
            <ul className="card overflow-hidden">
              {group.items.map((session) => <WorkoutRow key={session.id} session={session} />)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
