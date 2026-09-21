import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad } from '../../lib/useLoad';
import { Loading, LoadError } from '../../components/PageState';
import { formatWhen, formatDuration } from '../../lib/format';

const SET_TYPES = ['working', 'warmup', 'drop', 'failure'];
const nextNumber = (items, field) => items.reduce((max, item) => Math.max(max, item[field]), 0) + 1;

function AddSetForm({ sessionId, sessionExercise, onAdded }) {
  const last = sessionExercise.sets[sessionExercise.sets.length - 1];
  const [reps, setReps] = React.useState(last ? String(last.reps) : '');
  const [weight, setWeight] = React.useState(last && last.weight != null ? String(Number(last.weight)) : '');
  const [unit, setUnit] = React.useState((last && last.weight_unit) || 'kg');
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
    const body = { set_order: nextNumber(sessionExercise.sets, 'set_order'), reps: parseInt(reps, 10), set_type: setType };
    if (weight.trim() !== '') {
      body.weight = Number(weight);
      body.weight_unit = unit;
    }
    setSaving(true);
    try {
      await apiRequest(`/api/workout-sessions/${sessionId}/exercises/${sessionExercise.id}/sets`, { method: 'POST', body });
      onAdded();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  const id = (name) => `${name}-${sessionExercise.id}`;
  return (
    <form onSubmit={submit} className="mt-4 pt-4 border-t border-gray-800">
      {error && <div role="alert" className="alert-error mb-3">{error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label htmlFor={id('reps')} className="field-label">Reps</label>
          <input id={id('reps')} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor={id('weight')} className="field-label">Weight</label>
          <input id={id('weight')} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className="input" placeholder="optional" />
        </div>
        <div>
          <label htmlFor={id('unit')} className="field-label">Unit</label>
          <select id={id('unit')} value={unit} onChange={(e) => setUnit(e.target.value)} className="input">
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </div>
        <div>
          <label htmlFor={id('type')} className="field-label">Type</label>
          <select id={id('type')} value={setType} onChange={(e) => setSetType(e.target.value)} className="input">
            {SET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding...' : 'Add set'}</button>
      </div>
    </form>
  );
}

function ExerciseCard({ sessionId, sessionExercise, locked, onChanged }) {
  const { sets } = sessionExercise;
  return (
    <section className="card p-4" aria-label={sessionExercise.exercise_name}>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="font-semibold text-gray-100">{sessionExercise.exercise_name}</h2>
        <span className="text-xs uppercase tracking-wide text-gray-500">{sessionExercise.exercise_muscle_group}</span>
      </div>
      {sets.length === 0 ? (
        <p className="text-sm text-gray-500">No sets logged yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Sets for {sessionExercise.exercise_name}</caption>
          <thead className="text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="py-1 pr-3 font-medium">Set</th>
              <th scope="col" className="py-1 pr-3 font-medium">Reps</th>
              <th scope="col" className="py-1 pr-3 font-medium">Weight</th>
              <th scope="col" className="py-1 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.id} className="border-t border-gray-800">
                <td className="py-1.5 pr-3 text-gray-400">{set.set_order}</td>
                <td className="py-1.5 pr-3 text-gray-100">{set.reps}</td>
                <td className="py-1.5 pr-3 text-gray-100">{set.weight != null ? `${Number(set.weight)} ${set.weight_unit}` : '—'}</td>
                <td className="py-1.5 text-gray-400">{set.set_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!locked && <AddSetForm sessionId={sessionId} sessionExercise={sessionExercise} onAdded={onChanged} />}
    </section>
  );
}

function AddExercise({ sessionId, session, onAdded }) {
  const library = useLoad('/api/exercises');
  const [exerciseId, setExerciseId] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function add(event) {
    event.preventDefault();
    if (!exerciseId) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/api/workout-sessions/${sessionId}/exercises`, {
        method: 'POST',
        body: { exercise_id: exerciseId, exercise_order: nextNumber(session.session_exercises, 'exercise_order') },
      });
      setExerciseId('');
      onAdded();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (library.status === 'error') return <LoadError error={library.error} onRetry={library.reload} />;
  if (library.status === 'ready' && library.data.length === 0) {
    return <p className="card p-4 text-sm text-gray-400">Your exercise library is empty. <Link to="/exercises">Add an exercise</Link> first.</p>;
  }

  return (
    <form onSubmit={add} className="card p-4">
      {error && <div role="alert" className="alert-error mb-3">{error}</div>}
      <label htmlFor="add-exercise" className="field-label">Add an exercise</label>
      <div className="flex flex-wrap gap-3">
        <select id="add-exercise" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} disabled={library.status !== 'ready'} className="input flex-1 min-w-[12rem]">
          <option value="">{library.status === 'ready' ? 'Choose an exercise...' : 'Loading...'}</option>
          {library.status === 'ready' && library.data.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.muscle_group})</option>)}
        </select>
        <button type="submit" disabled={!exerciseId || saving} className="btn-primary">{saving ? 'Adding...' : 'Add'}</button>
      </div>
    </form>
  );
}

export default function WorkoutPage() {
  const { id } = useParams();
  const { status, data: session, error, reload } = useLoad(`/api/workout-sessions/${id}`);
  const [completing, setCompleting] = React.useState(false);
  const [completeError, setCompleteError] = React.useState('');

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

  if (status === 'loading') return <Loading label="Loading workout" />;
  if (status === 'error') {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="card p-6 max-w-lg">
          <p className="text-sm text-gray-300 mb-3">That workout was not found.</p>
          <Link to="/workouts">Back to workouts</Link>
        </div>
      );
    }
    return <LoadError error={error} onRetry={reload} />;
  }

  const locked = Boolean(session.completed_at);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/workouts" className="text-sm">&larr; Workouts</Link>
          <h1 className="text-2xl font-semibold mt-2">{formatWhen(session.started_at)}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {locked ? `Completed · ${formatDuration(session.started_at, session.completed_at)}` : <span className="text-amber-400">In progress</span>}
          </p>
        </div>
        {!locked && (
          <button type="button" onClick={complete} disabled={completing} className="btn-secondary">
            {completing ? 'Completing...' : 'Complete workout'}
          </button>
        )}
      </div>
      {completeError && <div role="alert" className="alert-error">{completeError}</div>}

      {session.session_exercises.length === 0 && (
        <p className="card p-4 text-sm text-gray-400">{locked ? 'No exercises were logged.' : 'No exercises yet. Add one below to start logging sets.'}</p>
      )}
      {session.session_exercises.map((sessionExercise) => (
        <ExerciseCard key={sessionExercise.id} sessionId={id} sessionExercise={sessionExercise} locked={locked} onChanged={reload} />
      ))}

      {!locked && <AddExercise sessionId={id} session={session} onAdded={reload} />}
    </div>
  );
}
