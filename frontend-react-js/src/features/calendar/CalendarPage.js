import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLoad } from '../../lib/useLoad';
import {
  WEEKDAY_SHORT, addDays, dateKey, dayState, estimateMinutes, parseDateKey, startOfDay, startOfWeek, weekLabel,
} from '../../lib/calendar';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronLeft, ChevronRight, Check } from '../../components/icons';
import DayStatus from './DayStatus';
import { useStartPlanned } from './useStartPlanned';

function TodayPanel({ day, onStart, busyId }) {
  const { planned, status, session } = day;
  const minutes = planned ? estimateMinutes(planned.exercises) : null;
  const count = planned ? planned.exercises.length : 0;
  const scrollToWeek = () => {
    const week = document.getElementById('week');
    if (week) week.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section aria-label="Today" className="card border-accent p-5 sm:p-6">
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
              count === 0 ? 'No exercises yet' : `${count} ${count === 1 ? 'exercise' : 'exercises'}${minutes ? ` · Estimated ~${minutes} min` : ''}`
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

function DayCell({ day, isToday, onStart, busyId }) {
  const { planned, status, session } = day;
  return (
    <li className={`flex min-h-[210px] flex-col rounded-[10px] border p-3 ${isToday ? 'border-accent bg-ink-900' : 'border-ink-700'}`}>
      <Link to={`/calendar/${dateKey(day.date)}`} className="flex-1 text-fg hover:no-underline">
        <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-accent' : 'text-fg-mute'}`}>
          {WEEKDAY_SHORT[day.index]} <span className="font-display text-base tabular-nums">{day.date.getDate()}</span>
        </p>
        {planned ? (
          <>
            <p className="mt-3 font-display text-xl font-extrabold leading-tight">{planned.name}</p>
            <p className="mt-1 text-sm text-fg-mute">{planned.exercises.length} {planned.exercises.length === 1 ? 'exercise' : 'exercises'}</p>
          </>
        ) : (
          <p className="mt-3 text-fg-mute">Rest</p>
        )}
      </Link>
      <div className="mt-3">
        {status === 'planned' && isToday && (
          <button type="button" onClick={() => onStart(planned.id)} disabled={busyId === planned.id} className="btn-primary h-10 min-h-0 w-full text-sm">Start</button>
        )}
        {status === 'in_progress' && <Link to={`/workouts/${session.id}`} className="btn-secondary h-10 min-h-0 w-full text-fg hover:text-fg">Continue</Link>}
        {status === 'completed' && <Link to={`/workouts/${session.id}`} className="btn-secondary h-10 min-h-0 w-full text-accent hover:text-accent"><Check width={14} height={14} />Done</Link>}
        {((status === 'planned' && !isToday) || status === 'missed') && <DayStatus status={status} />}
        {status === 'rest' && (
          <Link to={`/plan/workouts/new?weekday=${day.index}`} className="text-sm text-fg-mute hover:text-fg">+ Add workout</Link>
        )}
      </div>
    </li>
  );
}

function DayRow({ day, isToday }) {
  const { planned, status } = day;
  return (
    <li className="border-t border-ink-700 first:border-t-0">
      <Link
        to={`/calendar/${dateKey(day.date)}`}
        className={`grid min-h-[68px] grid-cols-[3.5rem_1fr_auto_1.25rem] items-center gap-3 px-4 text-fg hover:no-underline ${isToday ? 'bg-ink-800' : ''}`}
      >
        <span className="flex flex-col">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? 'text-accent' : 'text-fg-mute'}`}>{WEEKDAY_SHORT[day.index]}</span>
          <span className="font-display text-2xl font-bold leading-tight tabular-nums">{day.date.getDate()}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-lg font-bold">{planned ? planned.name : 'Rest'}</span>
          {planned && <span className="block text-[13px] text-fg-mute">{planned.exercises.length} {planned.exercises.length === 1 ? 'exercise' : 'exercises'}</span>}
        </span>
        <DayStatus status={status} className={status === 'rest' ? 'opacity-0' : ''} />
        <ChevronRight width={18} height={18} className="text-fg-mute" />
      </Link>
    </li>
  );
}

export default function CalendarPage() {
  const [params] = useSearchParams();
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(parseDateKey(params.get('week')) || today);
  const isCurrentWeek = weekStart.getTime() === startOfWeek(today).getTime();
  const range = `from=${encodeURIComponent(weekStart.toISOString())}&to=${encodeURIComponent(addDays(weekStart, 7).toISOString())}`;
  const plan = useLoad('/api/plan');
  const sessions = useLoad(`/api/workout-sessions?${range}`);
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:pb-12 sm:pt-10 lg:px-12">
      <p className="eyebrow">Plan → Train → Log → Repeat</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[38px] font-extrabold leading-none tracking-tight">Calendar</h1>
        {workouts.length > 0 && <Link to="/plan" className="btn-secondary">Edit week</Link>}
      </div>

      {(plan.status === 'loading' || sessions.status === 'loading') && <div className="mt-8"><Loading label="Loading your week" /></div>}
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Link to={prev} aria-label="Previous week" className="flex h-11 w-11 items-center justify-center rounded-lg text-fg hover:bg-ink-800 hover:no-underline"><ChevronLeft width={22} height={22} /></Link>
                <h2 className="min-w-[8.5rem] text-center font-display text-xl font-bold tabular-nums">{weekLabel(weekStart)}</h2>
                <Link to={next} aria-label="Next week" className="flex h-11 w-11 items-center justify-center rounded-lg text-fg hover:bg-ink-800 hover:no-underline"><ChevronRight width={22} height={22} /></Link>
              </div>
              {!isCurrentWeek && <Link to="/calendar" className="btn-secondary h-10 min-h-0">This week</Link>}
            </div>

            <ul className="hidden grid-cols-7 gap-2 lg:grid">
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
