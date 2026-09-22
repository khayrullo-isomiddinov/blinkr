import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLoad } from '../../lib/useLoad';
import {
  WEEKDAY_SHORT, addDays, dateKey, dayState, estimateMinutes, parseDateKey, startOfDay, startOfWeek, weekLabel,
} from '../../lib/calendar';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronLeft, ChevronRight, Check } from '../../components/icons';
import DayStatus, { DayMarker } from './DayStatus';
import { useStartPlanned } from './useStartPlanned';
import { useSessionsWindow } from './useSessionsWindow';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const preview = (planned) => planned.exercises.slice(0, 3).map((e) => e.exercise_name);

function TodayPanel({ day, onStart, busyId }) {
  const { planned, status, session } = day;
  const minutes = planned ? estimateMinutes(planned.exercises) : null;
  const count = planned ? planned.exercises.length : 0;
  const scrollToWeek = () => {
    const week = document.getElementById('week');
    if (week) week.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section aria-label="Today" className="card border-2 border-accent p-5 sm:p-6">
      <p className="eyebrow text-accent">Today</p>
      {status === 'rest' ? (
        <>
          <h2 className="mt-2 font-display text-[34px] font-extrabold leading-none tracking-tight">Rest day</h2>
          <p className="mt-2 text-sm text-fg-mute">Recover. The next session is in the week below.</p>
          <button type="button" onClick={scrollToWeek} className="btn-secondary mt-5">View week</button>
        </>
      ) : (
        <>
          <h2 className="mt-2 font-display text-[34px] font-extrabold leading-none tracking-tight">{planned.name}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-fg-mute">
            {status === 'completed' && <span className="inline-flex items-center gap-1 font-semibold text-accent"><Check width={14} height={14} />Completed</span>}
            {status === 'in_progress' && <span className="font-semibold text-accent">In progress</span>}
            {(status === 'planned' || status === 'missed') && (
              count === 0 ? 'No exercises yet' : `${plural(count, 'exercise')}${minutes ? ` · Estimated ~${minutes} min` : ''}`
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {(status === 'planned' || status === 'missed') && (
              <button type="button" onClick={() => onStart(planned.id)} disabled={busyId === planned.id} className="btn-primary h-12 px-6 text-base">
                {busyId === planned.id ? 'Starting...' : 'Start workout'}
              </button>
            )}
            {status === 'in_progress' && <Link to={`/workouts/${session.id}`} className="btn-primary h-12 px-6 text-base text-accent-ink hover:text-accent-ink">Continue workout</Link>}
            {status === 'completed' && <Link to={`/workouts/${session.id}`} className="btn-secondary h-12 px-6 text-base text-fg hover:text-fg">View workout</Link>}
            <Link to={`/plan/workouts/${planned.id}`} className="btn-secondary h-12 text-fg hover:text-fg">Edit plan</Link>
          </div>
        </>
      )}
    </section>
  );
}

// The whole card opens the day (a stretched link); the action button sits above it, so both stay real controls.
function DayCell({ day, isToday, onStart, busyId }) {
  const { planned, status, session } = day;
  const done = status === 'completed';
  const skin = done
    ? 'border-accent/40 bg-accent/10 hover:border-accent/70'
    : status === 'rest'
      ? 'border-dashed border-ink-700 hover:border-ink-500 hover:bg-ink-900'
      : isToday
        ? 'border-2 border-accent bg-ink-900 hover:bg-ink-800'
        : 'border-ink-700 bg-ink-900/60 hover:border-ink-500 hover:bg-ink-900';

  return (
    <li className={`group relative flex min-h-[290px] flex-col rounded-xl border p-4 pt-3.5 outline-none motion-safe:transition motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-accent/60 ${skin}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-[0.1em] ${isToday ? 'text-accent' : 'text-fg-mute'}`}>{WEEKDAY_SHORT[day.index]}</span>
        {isToday ? <span className="rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-ink">Today</span> : <DayMarker status={status} />}
      </div>

      <Link
        to={`/calendar/${dateKey(day.date)}`}
        aria-label={`${WEEKDAY_SHORT[day.index]} ${day.date.getDate()}, ${planned ? planned.name : 'rest'}`}
        className="mt-1.5 block text-fg after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:no-underline"
      >
        <span className={`block font-display text-[44px] font-extrabold leading-none tracking-tight tabular-nums ${isToday ? 'text-accent' : status === 'rest' ? 'text-fg-mute' : ''}`}>{day.date.getDate()}</span>
        {planned ? (
          <>
            <span className="mt-4 block font-display text-[22px] font-extrabold leading-tight tracking-tight">{planned.name}</span>
            <span className="mt-1 block text-[13px] text-fg-mute">{plural(planned.exercises.length, 'exercise')}{estimateMinutes(planned.exercises) ? ` · ~${estimateMinutes(planned.exercises)} min` : ''}</span>
          </>
        ) : (
          <span className="mt-4 block font-display text-xl font-bold text-fg-mute">Rest</span>
        )}
      </Link>

      {planned && planned.exercises.length > 0 && (
        <ul className="mt-3.5 space-y-1 text-[13px] text-fg-soft">
          {preview(planned).map((name) => <li key={name} className="truncate">{name}</li>)}
          {planned.exercises.length > 3 && <li className="text-fg-mute">+{planned.exercises.length - 3} more</li>}
        </ul>
      )}

      <div className="relative z-10 mt-auto pt-4">
        {status === 'planned' && isToday && (
          <button type="button" onClick={() => onStart(planned.id)} disabled={busyId === planned.id} className="btn-primary h-11 w-full text-base">{busyId === planned.id ? 'Starting...' : 'Start'}</button>
        )}
        {status === 'in_progress' && <Link to={`/workouts/${session.id}`} className="btn-primary h-11 w-full text-accent-ink hover:text-accent-ink">Continue</Link>}
        {done && <Link to={`/workouts/${session.id}`} className="btn-outline h-11 w-full border-accent/50 text-sm text-accent hover:text-accent">View workout</Link>}
        {((status === 'planned' && !isToday) || status === 'missed') && <span className="flex h-11 items-center"><DayStatus status={status} /></span>}
        {status === 'rest' && (
          <Link to={`/plan/workouts/new?weekday=${day.index}`} className="flex h-11 items-center text-sm text-fg-mute hover:text-fg motion-safe:transition-colors">+ Add workout</Link>
        )}
      </div>
    </li>
  );
}

function DayRow({ day, isToday }) {
  const { planned, status } = day;
  const done = status === 'completed';
  const chip = isToday ? 'bg-accent text-accent-ink' : done ? 'border border-accent/40 bg-accent/15' : 'bg-ink-800';
  return (
    <li className="border-t border-ink-700 first:border-t-0">
      <Link
        to={`/calendar/${dateKey(day.date)}`}
        className={`grid min-h-[76px] grid-cols-[3.25rem_1fr_auto] items-center gap-3.5 px-4 py-2 text-fg hover:no-underline motion-safe:transition-colors active:bg-ink-800 ${isToday ? 'bg-ink-900' : ''}`}
      >
        <span className={`flex h-[52px] w-[52px] flex-col items-center justify-center rounded-xl ${chip}`}>
          <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${isToday ? '' : done ? 'text-accent' : 'text-fg-mute'}`}>{WEEKDAY_SHORT[day.index]}</span>
          <span className={`font-display text-[22px] font-extrabold leading-none tabular-nums ${!isToday && status === 'rest' ? 'text-fg-mute' : ''}`}>{day.date.getDate()}</span>
        </span>
        <span className="min-w-0">
          <span className={`block truncate font-display text-[19px] font-extrabold leading-tight ${status === 'rest' ? 'text-fg-mute' : ''}`}>{planned ? planned.name : 'Rest'}</span>
          {planned && <span className="mt-0.5 block truncate text-[13px] text-fg-mute">{planned.exercises.length ? preview(planned).join(' · ') : 'No exercises yet'}</span>}
        </span>
        {isToday && status === 'planned' ? (
          <span className="font-display text-sm font-extrabold text-accent">Start</span>
        ) : status === 'rest' ? (
          <span className="text-[13px] text-fg-mute">Rest</span>
        ) : (
          <DayMarker status={status} size={26} />
        )}
      </Link>
    </li>
  );
}

function WeekProgress({ days }) {
  const planned = days.filter((d) => d.planned);
  const done = planned.filter((d) => d.status === 'completed').length;
  return (
    <div className="flex items-center gap-3.5">
      <div className="grid grid-cols-7 gap-1.5" aria-hidden="true">
        {days.map((d) => (
          <span
            key={d.index}
            className={`h-1.5 w-5 rounded-full sm:w-6 ${d.status === 'completed' ? 'bg-accent' : d.status === 'in_progress' ? 'bg-accent/50' : d.status === 'rest' ? 'border border-dashed border-ink-500' : 'bg-ink-600'}`}
          />
        ))}
      </div>
      {planned.length > 0 && <p className="text-sm text-fg-soft"><strong className="font-semibold text-fg">{done} of {planned.length}</strong> done</p>}
    </div>
  );
}

export default function CalendarPage() {
  const [params] = useSearchParams();
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(parseDateKey(params.get('week')) || today);
  const isCurrentWeek = weekStart.getTime() === startOfWeek(today).getTime();
  const plan = useLoad('/api/plan', { cache: true });
  const sessions = useSessionsWindow(weekStart);
  const { start, busyId, error: startError } = useStartPlanned();

  const workouts = (plan.data && plan.data.plan && plan.data.plan.workouts) || [];
  const byWeekday = Object.fromEntries(workouts.map((w) => [w.weekday, w]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const planned = byWeekday[index] || null;
    const onDate = (sessions.data || []).filter((s) => dateKey(new Date(s.started_at)) === dateKey(date));
    return { index, date, planned, ...dayState({ planned, sessions: onDate, date, today }) };
  });
  const todayDay = days.find((d) => d.date.getTime() === today.getTime());
  const prev = `/calendar?week=${dateKey(addDays(weekStart, -7))}`;
  const next = `/calendar?week=${dateKey(addDays(weekStart, 7))}`;
  const loading = plan.status === 'loading' || sessions.status === 'loading';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:pt-10 lg:px-12">
      <p className="eyebrow">Plan → Train → Log → Repeat</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[38px] font-extrabold leading-none tracking-tight">Calendar</h1>
        {workouts.length > 0 && <Link to="/plan" className="btn-secondary">Edit week</Link>}
      </div>

      {loading && <div className="mt-8"><Loading label="Loading your week" /></div>}
      {plan.status === 'error' && <div className="mt-8"><LoadError error={plan.error} onRetry={plan.reload} /></div>}
      {plan.status === 'ready' && sessions.status === 'error' && <div className="mt-8"><LoadError error={sessions.error} onRetry={sessions.reload} /></div>}

      {plan.status === 'ready' && sessions.status === 'ready' && (
        <>
          {startError && <div role="alert" className="alert-error mt-6">{startError}</div>}

          {workouts.length === 0 ? (
            <section aria-label="Your week" className="card mt-8 p-6 sm:p-8">
              <p className="eyebrow">Your week</p>
              <h2 className="mt-2 font-display text-[32px] font-extrabold leading-tight tracking-tight">Nothing planned yet.</h2>
              <p className="mt-3 max-w-md text-fg-mute">Build your training week and make every session count.</p>
              <Link to="/plan" className="btn-primary mt-6 h-12 px-6 text-base text-accent-ink hover:text-accent-ink">Create your plan</Link>
            </section>
          ) : (
            isCurrentWeek && todayDay && <div className="mt-8"><TodayPanel day={todayDay} onStart={start} busyId={busyId} /></div>
          )}

          <section id="week" aria-label="Week" className="mt-10 scroll-mt-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="flex items-center gap-1">
                <Link to={prev} aria-label="Previous week" className="flex h-11 w-11 items-center justify-center rounded-lg text-fg hover:bg-ink-800 hover:no-underline motion-safe:transition-colors"><ChevronLeft width={22} height={22} /></Link>
                <h2 className="min-w-[8.5rem] text-center font-display text-xl font-bold tabular-nums">{weekLabel(weekStart)}</h2>
                <Link to={next} aria-label="Next week" className="flex h-11 w-11 items-center justify-center rounded-lg text-fg hover:bg-ink-800 hover:no-underline motion-safe:transition-colors"><ChevronRight width={22} height={22} /></Link>
                {!isCurrentWeek && <Link to="/calendar" className="btn-secondary ml-2 h-10 min-h-0">This week</Link>}
              </div>
              <WeekProgress days={days} />
            </div>

            <ul className="hidden grid-cols-7 gap-2.5 lg:grid">
              {days.map((day) => <DayCell key={day.index} day={day} isToday={day.date.getTime() === today.getTime()} onStart={start} busyId={busyId} />)}
            </ul>
            <ul className="card overflow-hidden lg:hidden">
              {days.map((day) => <DayRow key={day.index} day={day} isToday={day.date.getTime() === today.getTime()} />)}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
