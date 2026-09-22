import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad, refreshLoad } from '../../lib/useLoad';
import { WEEKDAY_SHORT, WEEKDAY_NAMES } from '../../lib/calendar';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronLeft } from '../../components/icons';

const PUSH_PULL_LEGS = ['Push', 'Pull', '', 'Legs', 'Push', '', 'Pull'];

export default function PlanBuilderPage() {
  const navigate = useNavigate();
  const plan = useLoad('/api/plan', { cache: true });
  const [ready, setReady] = React.useState(false);
  const [names, setNames] = React.useState(Array(7).fill(''));
  const [copyFrom, setCopyFrom] = React.useState(Array(7).fill(''));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const workouts = (plan.data && plan.data.plan && plan.data.plan.workouts) || [];
  const byWeekday = Object.fromEntries(workouts.map((w) => [w.weekday, w]));

  React.useEffect(() => {
    if (ready || plan.status !== 'ready') return;
    setNames(Array.from({ length: 7 }, (_, d) => (byWeekday[d] ? byWeekday[d].name : '')));
    setReady(true);
  }, [ready, plan.status, byWeekday]);

  const setAt = (list, setter) => (index, value) => setter(list.map((v, i) => (i === index ? value : v)));
  const setName = setAt(names, setNames);
  const setCopy = setAt(copyFrom, setCopyFrom);

  function chooseCopy(index, workoutId) {
    setCopy(index, workoutId);
    const source = workouts.find((w) => w.id === workoutId);
    if (source && !names[index].trim()) setName(index, source.name);
  }

  // Creates, renames and copies first; removals last, so a copy can still use a day that is being cleared.
  async function save() {
    setSaving(true);
    setError('');
    try {
      for (let day = 0; day < 7; day += 1) {
        const existing = byWeekday[day];
        const name = names[day].trim();
        const source = copyFrom[day];
        if (!name) continue;
        if (source) {
          await apiRequest(`/api/plan/workouts/${source}/duplicate`, { method: 'POST', body: { weekday: day, name, replace: Boolean(existing) } });
        } else if (existing && name !== existing.name) {
          await apiRequest(`/api/plan/workouts/${existing.id}`, { method: 'PATCH', body: { name } });
        } else if (!existing) {
          await apiRequest('/api/plan/workouts', { method: 'POST', body: { weekday: day, name, exercises: [] } });
        }
      }
      for (let day = 0; day < 7; day += 1) {
        if (byWeekday[day] && !names[day].trim() && !copyFrom[day]) {
          await apiRequest(`/api/plan/workouts/${byWeekday[day].id}`, { method: 'DELETE' });
        }
      }
      await refreshLoad('/api/plan').catch(() => {});
      navigate('/calendar');
    } catch (err) {
      setError(describeApiError(err));
      setSaving(false);
    }
  }

  if (plan.status === 'loading') return <div className="mx-auto max-w-2xl p-4"><Loading label="Loading your plan" /></div>;
  if (plan.status === 'error') return <div className="p-4"><LoadError error={plan.error} onRetry={plan.reload} /></div>;

  const hasWorkouts = workouts.length > 0;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-fg-mute hover:no-underline"><ChevronLeft width={16} height={16} />Calendar</Link>
      <h1 className="mt-4 font-display text-[34px] font-extrabold leading-tight tracking-tight">{hasWorkouts ? 'Edit your week' : 'Create your week'}</h1>
      <p className="mt-2 max-w-md text-sm text-fg-mute">
        Name each training day and leave the rest days empty. This repeats every week. You add the exercises next.
      </p>
      {!hasWorkouts && (
        <button type="button" onClick={() => setNames(PUSH_PULL_LEGS)} className="btn-secondary mt-4">Start from Push / Pull / Legs</button>
      )}

      <ul className="mt-6">
        {WEEKDAY_SHORT.map((label, day) => {
          const existing = byWeekday[day];
          const clearing = existing && !names[day].trim() && !copyFrom[day];
          return (
            <li key={label} className="border-t border-ink-700 py-3">
              <div className="grid grid-cols-[3.25rem_1fr] items-center gap-3">
                <label htmlFor={`day-${day}`} className="font-display text-lg font-bold">
                  <span className="sr-only">{WEEKDAY_NAMES[day]}</span><span aria-hidden="true">{label}</span>
                </label>
                <div className="flex gap-2">
                  <input id={`day-${day}`} value={names[day]} onChange={(e) => setName(day, e.target.value)} maxLength={60} placeholder="Rest" className="input min-w-0 flex-1 font-display text-lg font-bold" />
                  {existing && <Link to={`/plan/workouts/${existing.id}`} className="btn-secondary flex-none text-fg hover:text-fg">Exercises</Link>}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-[3.25rem_1fr] items-center gap-3">
                <span />
                <div className="flex flex-wrap items-center gap-3">
                  {workouts.filter((w) => w.weekday !== day).length > 0 && (
                    <>
                      <label htmlFor={`copy-${day}`} className="sr-only">Copy a workout to {WEEKDAY_NAMES[day]}</label>
                      <select id={`copy-${day}`} value={copyFrom[day]} onChange={(e) => chooseCopy(day, e.target.value)} className="input h-10 min-h-0 w-auto py-1 text-sm">
                        <option value="">Copy from...</option>
                        {workouts.filter((w) => w.weekday !== day).map((w) => <option key={w.id} value={w.id}>{w.name} ({WEEKDAY_SHORT[w.weekday]})</option>)}
                      </select>
                    </>
                  )}
                  {clearing && <p className="text-xs text-fg-mute">Becomes a rest day. Its exercises are removed.</p>}
                  {copyFrom[day] && <p className="text-xs text-fg-mute">{existing ? `Replaces ${existing.name} with a copy.` : 'Copies its exercises and targets.'}</p>}
                </div>
              </div>
            </li>
          );
        })}
        <li className="border-t border-ink-700" />
      </ul>

      {error && <div role="alert" className="alert-error mt-5">{error}</div>}
      <button type="button" onClick={save} disabled={saving || !ready} className="btn-primary mt-6 h-14 w-full text-lg">{saving ? 'Saving...' : 'Save week'}</button>
    </div>
  );
}
