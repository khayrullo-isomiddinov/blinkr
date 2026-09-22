import React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad, refreshLoad } from '../../lib/useLoad';
import { WEEKDAY_SHORT, WEEKDAY_NAMES } from '../../lib/calendar';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronLeft, ChevronUp, ChevronDown, Close, Plus } from '../../components/icons';

let rowCounter = 0;

const rowFromExercise = (exercise) => ({
  key: ++rowCounter, exercise_id: exercise.id, name: exercise.name, sets: '3', repsMin: '', repsMax: '', weight: '', unit: 'kg', notes: '',
});

const rowFromPlanned = (e) => ({
  key: ++rowCounter,
  exercise_id: e.exercise_id,
  name: e.exercise_name,
  sets: String(e.target_sets),
  repsMin: e.target_reps_min == null ? '' : String(e.target_reps_min),
  repsMax: e.target_reps_max == null ? '' : String(e.target_reps_max),
  weight: e.target_weight == null ? '' : String(Number(e.target_weight)),
  unit: e.target_weight_unit || 'kg',
  notes: e.notes || '',
});

const whole = (text) => /^\d+$/.test(text.trim());

// The friendly first line of defence; the server validates everything again.
function problem(name, weekday, rows) {
  if (!name.trim()) return 'Give the workout a name.';
  if (weekday == null) return 'Pick a day for this workout.';
  for (const row of rows) {
    const sets = Number(row.sets);
    if (!whole(row.sets) || sets < 1 || sets > 20) return `${row.name}: sets must be a whole number from 1 to 20.`;
    if (row.repsMin.trim() && !whole(row.repsMin)) return `${row.name}: reps must be a whole number.`;
    if (row.repsMax.trim() && (!row.repsMin.trim() || !whole(row.repsMax))) return `${row.name}: enter the lower rep number first, then the top of the range.`;
    if (row.repsMax.trim() && Number(row.repsMax) < Number(row.repsMin)) return `${row.name}: the top of the rep range must be higher than the bottom.`;
    if (row.weight.trim() && !Number.isFinite(Number(row.weight))) return `${row.name}: weight must be a number.`;
  }
  return '';
}

function payload(name, weekday, rows) {
  return {
    name: name.trim(),
    weekday,
    exercises: rows.map((row) => ({
      exercise_id: row.exercise_id,
      target_sets: Number(row.sets),
      target_reps_min: row.repsMin.trim() ? Number(row.repsMin) : null,
      target_reps_max: row.repsMax.trim() ? Number(row.repsMax) : null,
      target_weight: row.weight.trim() ? Number(row.weight) : null,
      target_weight_unit: row.weight.trim() ? row.unit : null,
      notes: row.notes.trim() || null,
    })),
  };
}

function Field({ id, label, value, onChange, inputMode = 'numeric', placeholder = '' }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} inputMode={inputMode} placeholder={placeholder} className="input px-2 text-center font-display text-lg font-bold" />
    </div>
  );
}

function ExerciseRow({ row, index, count, onChange, onMove, onRemove }) {
  const id = (part) => `row-${row.key}-${part}`;
  return (
    <li className="border-t border-ink-700 py-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-6 text-sm text-fg-mute">{index + 1}</span>
        <p className="flex-1 font-display text-lg font-bold leading-tight">{row.name}</p>
        <button type="button" aria-label={`Move ${row.name} up`} disabled={index === 0} onClick={() => onMove(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-mute hover:bg-ink-800 disabled:opacity-30"><ChevronUp width={18} height={18} /></button>
        <button type="button" aria-label={`Move ${row.name} down`} disabled={index === count - 1} onClick={() => onMove(1)} className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-mute hover:bg-ink-800 disabled:opacity-30"><ChevronDown width={18} height={18} /></button>
        <button type="button" aria-label={`Remove ${row.name}`} onClick={onRemove} className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-mute hover:bg-ink-800"><Close width={18} height={18} /></button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 pl-8">
        <Field id={id('sets')} label="Sets" value={row.sets} onChange={(v) => onChange({ sets: v })} />
        <Field id={id('min')} label="Reps" value={row.repsMin} onChange={(v) => onChange({ repsMin: v })} placeholder="6" />
        <Field id={id('max')} label="To" value={row.repsMax} onChange={(v) => onChange({ repsMax: v })} placeholder="8" />
        <Field id={id('weight')} label="Weight" value={row.weight} onChange={(v) => onChange({ weight: v })} inputMode="decimal" placeholder="80" />
      </div>
      <div className="mt-2 flex items-center gap-2 pl-8">
        <div role="group" aria-label="Weight unit" className="grid w-24 flex-none grid-cols-2 gap-1 rounded-lg bg-ink-950 p-1">
          {['kg', 'lb'].map((u) => (
            <button key={u} type="button" aria-pressed={row.unit === u} onClick={() => onChange({ unit: u })} className={`h-9 rounded-md text-sm ${row.unit === u ? 'bg-ink-500 font-semibold text-fg' : 'text-fg-mute'}`}>{u}</button>
          ))}
        </div>
        <label htmlFor={id('notes')} className="sr-only">Notes for {row.name}</label>
        <input id={id('notes')} value={row.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Note (optional)" maxLength={200} className="input min-w-0 flex-1" />
      </div>
    </li>
  );
}

function AddExercise({ library, onAdd }) {
  const [id, setId] = React.useState('');
  if (library.status === 'error') return <LoadError error={library.error} onRetry={library.reload} />;
  if (library.status === 'ready' && library.data.length === 0) {
    return <p className="card p-4 text-sm text-fg-mute">Your exercise library is empty. <Link to="/exercises">Add an exercise</Link> first.</p>;
  }
  const submit = (event) => {
    event.preventDefault();
    const exercise = library.status === 'ready' && library.data.find((e) => e.id === id);
    if (!exercise) return;
    onAdd(exercise);
    setId('');
  };
  return (
    <form onSubmit={submit} className="card p-4">
      <label htmlFor="plan-add-exercise" className="field-label">Add an exercise</label>
      <div className="flex flex-wrap gap-2.5">
        <select id="plan-add-exercise" value={id} onChange={(e) => setId(e.target.value)} disabled={library.status !== 'ready'} className="input min-w-[12rem] flex-1">
          <option value="">{library.status === 'ready' ? 'Choose an exercise...' : 'Loading...'}</option>
          {library.status === 'ready' && library.data.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.muscle_group})</option>)}
        </select>
        <button type="submit" disabled={!id} className="btn-primary"><Plus width={18} height={18} />Add</button>
      </div>
    </form>
  );
}

export default function WorkoutEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isNew = id === undefined;
  const plan = useLoad('/api/plan', { cache: true });
  const library = useLoad('/api/exercises');
  const [ready, setReady] = React.useState(false);
  const [name, setName] = React.useState('');
  const [weekday, setWeekday] = React.useState(null);
  const [rows, setRows] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const workouts = (plan.data && plan.data.plan && plan.data.plan.workouts) || [];
  const existing = isNew ? null : workouts.find((w) => w.id === id) || null;
  const byWeekday = Object.fromEntries(workouts.map((w) => [w.weekday, w]));

  // Fill the form once, when the plan first arrives; later plan reloads (a copy, say) must not wipe edits.
  React.useEffect(() => {
    if (ready || plan.status !== 'ready') return;
    if (isNew) {
      const wanted = Number(params.get('weekday'));
      const free = [0, 1, 2, 3, 4, 5, 6].filter((d) => !byWeekday[d]);
      setWeekday(Number.isInteger(wanted) && wanted >= 0 && wanted <= 6 && !byWeekday[wanted] ? wanted : free[0] ?? null);
      setName(params.get('name') || '');
      setReady(true);
    } else if (existing) {
      setName(existing.name);
      setWeekday(existing.weekday);
      setRows(existing.exercises.map(rowFromPlanned));
      setReady(true);
    }
  }, [ready, plan.status, isNew, existing, params, byWeekday]);

  const update = (key, changes) => setRows((current) => current.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  const move = (index, delta) => setRows((current) => {
    const next = [...current];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return next;
  });

  async function save(event) {
    event.preventDefault();
    const message = problem(name, weekday, rows);
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = payload(name, weekday, rows);
      if (isNew) await apiRequest('/api/plan/workouts', { method: 'POST', body });
      else await apiRequest(`/api/plan/workouts/${id}`, { method: 'PATCH', body });
      await refreshLoad('/api/plan').catch(() => {});
      navigate('/calendar');
    } catch (err) {
      setError(describeApiError(err));
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/api/plan/workouts/${id}`, { method: 'DELETE' });
      await refreshLoad('/api/plan').catch(() => {});
      navigate('/calendar');
    } catch (err) {
      setError(describeApiError(err));
      setSaving(false);
    }
  }

  // A cached plan may predate this workout; wait for the refresh before calling it missing.
  if (plan.status === 'loading' || (!isNew && !existing && plan.fetching)) return <div className="mx-auto max-w-2xl p-4"><Loading label="Loading" /></div>;
  if (plan.status === 'error') return <div className="p-4"><LoadError error={plan.error} onRetry={plan.reload} /></div>;
  if (!isNew && !existing) {
    return (
      <div className="card m-4 max-w-lg p-6">
        <p className="mb-3 text-sm text-fg-soft">That planned workout was not found.</p>
        <Link to="/calendar">Back to calendar</Link>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-fg-mute hover:no-underline"><ChevronLeft width={16} height={16} />Calendar</Link>
      <p className="eyebrow mt-4">{isNew ? 'New workout' : 'Edit workout'}</p>

      <label htmlFor="workout-name" className="sr-only">Workout name</label>
      <input id="workout-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Workout name" className="input mt-1.5 h-11 font-display text-xl font-bold" />

      <p className="field-label mt-4">Day</p>
      <div role="group" aria-label="Day of the week" className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_SHORT.map((label, index) => {
          const taken = byWeekday[index] && (!existing || byWeekday[index].id !== existing.id);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={weekday === index}
              aria-label={`${WEEKDAY_NAMES[index]}${taken ? `, already has ${byWeekday[index].name}` : ''}`}
              disabled={Boolean(taken)}
              onClick={() => setWeekday(index)}
              className="seg-btn flex flex-col items-center justify-center py-1 disabled:opacity-30"
            >
              {label}
              {taken && <span className="block max-w-full truncate px-0.5 text-[9px] leading-tight opacity-80">{byWeekday[index].name}</span>}
            </button>
          );
        })}
      </div>

      <h2 className="eyebrow mt-8">Exercises</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-fg-mute">No exercises yet. Add the first one below.</p>
      ) : (
        <ol className="mt-2">
          {rows.map((row, index) => (
            <ExerciseRow
              key={row.key}
              row={row}
              index={index}
              count={rows.length}
              onChange={(changes) => update(row.key, changes)}
              onMove={(delta) => move(index, delta)}
              onRemove={() => setRows((current) => current.filter((r) => r.key !== row.key))}
            />
          ))}
          <li className="border-t border-ink-700" />
        </ol>
      )}

      <div className="mt-4">
        <AddExercise library={library} onAdd={(exercise) => setRows((current) => [...current, rowFromExercise(exercise)])} />
      </div>

      {error && <div role="alert" className="alert-error mt-5">{error}</div>}
      <button type="submit" disabled={saving || !ready} className="btn-primary mt-6 h-14 w-full text-lg">{saving ? 'Saving...' : 'Save workout'}</button>

      {!isNew && existing && (
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-ink-700 pt-6 text-center">
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-danger">Delete workout</button>
          ) : (
            <>
              <p className="text-sm text-fg-soft">Delete {existing.name}? Workouts you already did stay in your history.</p>
              <div className="flex gap-2">
                <button type="button" onClick={remove} disabled={saving} className="btn-danger">{saving ? 'Deleting...' : 'Delete'}</button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={saving} className="btn-secondary">Cancel</button>
              </div>
            </>
          )}
        </div>
      )}
    </form>
  );
}
