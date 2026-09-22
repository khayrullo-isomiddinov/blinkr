import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad } from '../../lib/useLoad';
import { formatDay, formatClock, formatDuration, formatElapsed } from '../../lib/format';
import { formatTarget } from '../../lib/calendar';
import { Loading, LoadError } from '../../components/PageState';
import { ChevronLeft, ChevronRight, Plus, Minus, Check } from '../../components/icons';

const SET_TYPES = [['warmup', 'Warm-up'], ['working', 'Working'], ['drop', 'Drop'], ['failure', 'Failure']];
const TYPE_LABEL = Object.fromEntries(SET_TYPES);
const nextNumber = (items, field) => items.reduce((max, item) => Math.max(max, item[field]), 0) + 1;
const num = 'font-display font-bold tabular-nums';

function formatSet(set) {
  return set.weight != null ? `${Number(set.weight)} ${set.weight_unit} × ${set.reps}` : `${set.reps} reps`;
}

function setCount(exercise) {
  return `${exercise.sets.length} ${exercise.sets.length === 1 ? 'set' : 'sets'}`;
}

function useElapsed(startedAt, running) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return startedAt ? now - new Date(startedAt).getTime() : 0;
}

function SetRows({ sets, muted }) {
  if (sets.length === 0) return <p className="border-t border-ink-700 py-4 text-sm text-fg-mute">No sets logged yet.</p>;
  return (
    <ul>
      {sets.map((set) => (
        <li key={set.id} className={`grid grid-cols-[2rem_1fr_auto] items-center border-t ${muted ? 'h-[46px] border-ink-700/70' : 'h-[52px] border-ink-700'}`}>
          <span className="text-sm text-fg-mute">{set.set_order}</span>
          <span className={`text-sm ${set.set_type === 'warmup' || muted ? 'text-fg-mute' : 'text-fg'}`}>{TYPE_LABEL[set.set_type] || set.set_type}</span>
          <span className={`${num} ${muted ? 'text-[19px] text-fg-soft' : 'text-[21px] lg:text-[22px]'}`}>{formatSet(set)}</span>
        </li>
      ))}
    </ul>
  );
}

function Stepper({ id, label, value, onChange, step, inputMode }) {
  const bump = (direction) => {
    const current = Number(value);
    const base = value.trim() !== '' && Number.isFinite(current) ? current : 0;
    onChange(String(Math.max(0, Math.round((base + direction * step) * 100) / 100)));
  };
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="flex h-[60px] gap-1">
        <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => bump(-1)} className="stepper-btn"><Minus width={20} height={20} /></button>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder="0"
          className="w-full min-w-0 flex-1 bg-transparent text-center font-display text-[26px] font-extrabold tabular-nums text-fg placeholder-ink-500 focus:outline-none sm:text-[32px]"
        />
        <button type="button" aria-label={`Increase ${label.toLowerCase()}`} onClick={() => bump(1)} className="stepper-btn"><Plus width={20} height={20} /></button>
      </div>
    </div>
  );
}

// The heaviest set (then most reps) of a list of sets.
function topSet(sets) {
  return [...sets].sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0) || b.reps - a.reps)[0];
}

// What the plan asked for, next to what was actually done last time. Either can be missing. A quiet readout, not a
// pair of dashboard tiles -- this is reference information, secondary to the set list right below it.
function TargetPanel({ exercise }) {
  const planned = Boolean(exercise.target_sets);
  const last = exercise.last_time;
  if (!planned && !last) return null;
  const done = exercise.sets.length;
  return (
    <div className="mb-1 flex flex-col gap-2.5 border-b border-ink-700 pb-4 sm:flex-row sm:items-baseline sm:gap-8">
      {planned && (
        <p className="flex items-baseline gap-2">
          <span className="field-label mb-0">Target</span>
          <span className={`${num} text-lg`}>{formatTarget(exercise)}</span>
          <span className="text-xs text-fg-mute">{done >= exercise.target_sets ? 'all done' : `set ${done + 1} of ${exercise.target_sets}`}</span>
        </p>
      )}
      {last && (
        <p className="flex items-baseline gap-2">
          <span className="field-label mb-0">Last time</span>
          <span className={`${num} text-lg`}>{formatSet(topSet(last.sets))}</span>
          <span className="text-xs text-fg-mute">{new Date(last.performed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        </p>
      )}
    </div>
  );
}

function SetComposer({ sessionId, exercise, onLogged }) {
  const last = exercise.sets[exercise.sets.length - 1];
  const planned = exercise.target_sets ? exercise : null;
  // First set of a planned exercise starts from the target; after that, from the previous set.
  const [reps, setReps] = React.useState(last ? String(last.reps) : planned ? String(planned.target_reps_max ?? planned.target_reps_min ?? '') : '');
  const [weight, setWeight] = React.useState(last ? (last.weight != null ? String(Number(last.weight)) : '') : planned && planned.target_weight != null ? String(Number(planned.target_weight)) : '');
  const [unit, setUnit] = React.useState((last && last.weight_unit) || (planned && planned.target_weight_unit) || 'kg');
  const [setType, setSetType] = React.useState('working');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!/^\d+$/.test(reps.trim())) {
      setError('Reps must be a whole number.');
      return;
    }
    if (weight.trim() !== '' && !Number.isFinite(Number(weight))) {
      setError('Weight must be a number.');
      return;
    }
    const body = { set_order: nextNumber(exercise.sets, 'set_order'), reps: parseInt(reps, 10), set_type: setType };
    if (weight.trim() !== '') {
      body.weight = Number(weight);
      body.weight_unit = unit;
    }
    setSaving(true);
    try {
      await apiRequest(`/api/workout-sessions/${sessionId}/exercises/${exercise.id}/sets`, { method: 'POST', body });
      onLogged();
    } catch (err) {
      setError(describeApiError(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Log a set" className="card mt-3.5 flex flex-col gap-3 p-3.5 lg:p-[18px]">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg font-bold lg:text-xl">Set {nextNumber(exercise.sets, 'set_order')}</span>
        {last && <span className="text-[13px] text-fg-mute">Prev {formatSet(last)}</span>}
      </div>
      {error && <div role="alert" className="alert-error">{error}</div>}
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-end lg:gap-4">
        <Stepper id="set-weight" label="Weight" value={weight} onChange={setWeight} step={unit === 'kg' ? 2.5 : 5} inputMode="decimal" />
        <Stepper id="set-reps" label="Reps" value={reps} onChange={setReps} step={1} inputMode="numeric" />
        <div role="group" aria-label="Unit" className="col-span-2 grid grid-cols-2 gap-1 rounded-lg bg-ink-950 p-1 lg:col-span-1 lg:h-[60px] lg:w-[132px]">
          {['kg', 'lb'].map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`h-10 rounded-md text-[15px] lg:h-auto ${unit === u ? 'bg-ink-500 font-semibold text-fg' : 'text-fg-mute'}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <div role="group" aria-label="Set type" className="grid grid-cols-4 gap-1.5 lg:gap-2">
        {SET_TYPES.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={setType === value} onClick={() => setSetType(value)} className="seg-btn">{label}</button>
        ))}
      </div>
      <button type="submit" disabled={saving} className="btn-primary h-14 text-[19px]">
        <Plus width={20} height={20} />{saving ? 'Adding...' : 'Add set'}
      </button>
    </form>
  );
}

function AddExercisePanel({ sessionId, session, library, onAdded, onCancel }) {
  const [exerciseId, setExerciseId] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function add(event) {
    event.preventDefault();
    if (!exerciseId) return;
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest(`/api/workout-sessions/${sessionId}/exercises`, {
        method: 'POST',
        body: { exercise_id: exerciseId, exercise_order: nextNumber(session.session_exercises, 'exercise_order') },
      });
      setExerciseId('');
      onAdded(created);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (library.status === 'error') return <LoadError error={library.error} onRetry={library.reload} />;
  if (library.status === 'ready' && library.data.length === 0) {
    return <p className="card p-4 text-sm text-fg-mute">Your exercise library is empty. <Link to="/exercises">Add an exercise</Link> first.</p>;
  }

  return (
    <form onSubmit={add} className="card p-4">
      {error && <div role="alert" className="alert-error mb-3">{error}</div>}
      <label htmlFor="add-exercise" className="field-label">Add an exercise</label>
      <div className="flex flex-wrap gap-2.5">
        <select id="add-exercise" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} disabled={library.status !== 'ready'} className="input min-w-[12rem] flex-1">
          <option value="">{library.status === 'ready' ? 'Choose an exercise...' : 'Loading...'}</option>
          {library.status === 'ready' && library.data.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.muscle_group})</option>)}
        </select>
        <button type="submit" disabled={!exerciseId || saving} className="btn-primary">{saving ? 'Adding...' : 'Add'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}
      </div>
    </form>
  );
}

function MobileHeader({ session, locked, elapsed }) {
  const plan = session.plan_name ? `${session.plan_name} · ` : '';
  return (
    <header className="flex items-center gap-1 px-4 py-2 pl-1 lg:hidden">
      <Link to="/workouts" aria-label="Back to workouts" className="flex h-11 w-11 items-center justify-center text-fg hover:no-underline">
        <ChevronLeft width={22} height={22} />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[19px] font-bold leading-tight">{formatDay(session.started_at)}</h1>
        <p className="text-[13px] text-fg-mute">{locked ? `${plan}${formatClock(session.started_at)} – ${formatClock(session.completed_at)}` : `${plan}Started ${formatClock(session.started_at)}`}</p>
      </div>
      {locked ? (
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-fg-mute">Duration</p>
          <p className="font-display text-2xl font-extrabold leading-tight text-fg-soft">{formatDuration(session.started_at, session.completed_at)}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-fg-mute">Elapsed</span>
          <span className="font-display text-[28px] font-extrabold leading-none tabular-nums">{formatElapsed(elapsed)}</span>
        </div>
      )}
    </header>
  );
}

function BackLink() {
  return (
    <Link to="/workouts" className="hidden items-center gap-1 text-sm text-fg-mute hover:no-underline lg:inline-flex">
      <ChevronLeft width={16} height={16} />Workouts
    </Link>
  );
}

function CompletedView({ session }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 lg:pt-8">
      <BackLink />
      <div className="mt-2 hidden lg:block">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{formatDay(session.started_at)}</h1>
        <p className="mt-1 text-sm text-fg-mute">{formatClock(session.started_at)} – {formatClock(session.completed_at)} · {formatDuration(session.started_at, session.completed_at)}</p>
      </div>
      <div className="card mt-2 flex items-center gap-3 px-3.5 py-3 lg:mt-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-ink"><Check width={16} height={16} /></span>
        <div>
          <p className="font-display font-bold">Workout completed</p>
          <p className="text-xs text-fg-mute">Read-only. Sets can no longer be changed here.</p>
        </div>
      </div>
      {session.session_exercises.length === 0 && <p className="mt-6 text-sm text-fg-mute">No exercises were logged.</p>}
      {session.session_exercises.map((exercise) => (
        <section key={exercise.id} aria-label={exercise.exercise_name} className="pt-6">
          <h2 className="font-display text-2xl font-extrabold leading-tight text-fg-soft">{exercise.exercise_name}</h2>
          <p className="mb-2 mt-0.5 text-[13px] capitalize text-fg-mute">{exercise.exercise_muscle_group}</p>
          <SetRows sets={exercise.sets} muted />
        </section>
      ))}
    </div>
  );
}

export default function WorkoutPage() {
  const { id } = useParams();
  const { status, data: session, error, reload } = useLoad(`/api/workout-sessions/${id}`);
  const library = useLoad('/api/exercises');
  const [selectedId, setSelectedId] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);
  const [completeError, setCompleteError] = React.useState('');
  const locked = Boolean(session && session.completed_at);
  const elapsed = useElapsed(session && session.started_at, Boolean(session) && !locked);

  async function complete() {
    setCompleting(true);
    setCompleteError('');
    try {
      await apiRequest(`/api/workout-sessions/${id}/complete`, { method: 'PATCH' });
      reload();
    } catch (err) {
      setCompleteError(describeApiError(err));
    } finally {
      setCompleting(false);
    }
  }

  if (status === 'loading') return <div className="mx-auto max-w-2xl p-4"><Loading label="Loading workout" /></div>;
  if (status === 'error') {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="card m-4 max-w-lg p-6">
          <p className="mb-3 text-sm text-fg-soft">That workout was not found.</p>
          <Link to="/workouts">Back to workouts</Link>
        </div>
      );
    }
    return <div className="p-4"><LoadError error={error} onRetry={reload} /></div>;
  }

  const exercises = session.session_exercises;
  const selected = exercises.find((e) => e.id === selectedId) || exercises[0];
  const others = exercises.filter((e) => !selected || e.id !== selected.id);
  const showAddPanel = adding || exercises.length === 0;

  function added(created) {
    setSelectedId(created.id);
    setAdding(false);
    reload();
  }

  const completeControls = (
    <>
      <button type="button" onClick={complete} disabled={completing} className="btn-outline h-[52px] w-full text-[17px]">
        {completing ? 'Completing...' : 'Complete workout'}
      </button>
      <p className="mt-2.5 text-center text-xs text-fg-mute lg:text-left">Completed workouts are read-only.</p>
    </>
  );

  return (
    <div>
      <MobileHeader session={session} locked={locked} elapsed={elapsed} />
      {completeError && <div role="alert" className="alert-error mx-4 mb-2">{completeError}</div>}

      {locked ? (
        <CompletedView session={session} />
      ) : (
        <div className="mx-auto w-full px-4 pb-12 lg:grid lg:max-w-[1128px] lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12 lg:px-12 lg:py-8">
          <div>
            <BackLink />
            {showAddPanel && (
              <div className="mb-5 lg:mt-4">
                <AddExercisePanel sessionId={id} session={session} library={library} onAdded={added} onCancel={exercises.length > 0 ? () => setAdding(false) : null} />
              </div>
            )}

            {selected && !adding && (
              <section aria-label={selected.exercise_name} className="lg:mt-4">
                <div className="pb-2.5 pt-3">
                  <h2 className="font-display text-[29px] font-extrabold leading-[1.05] tracking-tight lg:text-4xl">{selected.exercise_name}</h2>
                  <p className="mt-1 text-sm capitalize text-fg-mute lg:text-[15px]">{selected.exercise_muscle_group} · {setCount(selected)} logged</p>
                </div>
                <TargetPanel exercise={selected} />
                <SetRows sets={selected.sets} />
                <SetComposer key={`${selected.id}:${selected.sets.length}`} sessionId={id} exercise={selected} onLogged={reload} />
              </section>
            )}

            {others.length > 0 && (
              <div className="mt-5">
                {others.map((exercise) => {
                  const last = exercise.sets[exercise.sets.length - 1];
                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      aria-expanded="false"
                      onClick={() => { setSelectedId(exercise.id); setAdding(false); }}
                      className="grid h-[60px] w-full grid-cols-[1fr_auto_1.25rem] items-center gap-2 border-t border-ink-700 text-left text-fg"
                    >
                      <span className="font-display text-[19px] font-bold lg:text-xl">{exercise.exercise_name}</span>
                      <span className="text-[13px] text-fg-mute lg:text-sm">{last ? `${setCount(exercise)} · ${formatSet(last)}` : exercise.target_sets ? formatTarget(exercise) : 'No sets yet'}</span>
                      <ChevronRight width={18} height={18} className="text-fg-mute" />
                    </button>
                  );
                })}
                <div className="border-t border-ink-700" />
              </div>
            )}

            <div className="mt-4 lg:hidden">
              <button type="button" onClick={() => setAdding(true)} className="btn-secondary h-[52px] w-full text-[15px]"><Plus width={18} height={18} />Add exercise</button>
              <div className="mt-3">{completeControls}</div>
            </div>
          </div>

          <aside aria-label="Workout" className="sticky top-8 hidden self-start pt-[52px] lg:block">
            <div className="card p-5">
              {session.plan_name && <p className="eyebrow mb-1 text-accent">{session.plan_name}</p>}
              <p className="font-display text-lg font-bold">{formatDay(session.started_at)}</p>
              <p className="mt-0.5 text-[13px] text-fg-mute">Started {formatClock(session.started_at)} · In progress</p>
              <p className="mt-[18px] text-[11px] uppercase tracking-wider text-fg-mute">Elapsed</p>
              <p className="font-display text-[56px] font-extrabold leading-[1.05] tabular-nums">{formatElapsed(elapsed)}</p>
              <div className="mt-5">{completeControls}</div>
            </div>
            <button type="button" onClick={() => setAdding(true)} className="btn-secondary mt-3 h-[52px] w-full text-[15px]"><Plus width={18} height={18} />Add exercise</button>
          </aside>
        </div>
      )}
    </div>
  );
}
