import React from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad } from '../../lib/useLoad';
import { Loading, LoadError } from '../../components/PageState';
import { Dumbbell } from '../../components/icons';
import { exerciseIconUrl } from '../../lib/exerciseIcons';

const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

// Falls back to the generic icon for the exercises we don't have a matched illustration for.
export function ExerciseLogo({ exercise, size = 32 }) {
  const src = exerciseIconUrl(exercise.name);
  if (!src) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-md border border-ink-700 bg-ink-900 text-fg-mute"
        style={{ width: size, height: size }}
      >
        <Dumbbell width={size * 0.55} height={size * 0.55} />
      </span>
    );
  }
  return (
    // The artwork is white-on-transparent (see THIRD_PARTY_NOTICES.md), so the swatch behind it stays
    // a fixed dark shade regardless of light/dark mode -- otherwise it vanishes on the light theme.
    <img
      src={src}
      alt=""
      className="shrink-0 rounded-md border border-chrome-line bg-chrome object-contain p-0.5"
      style={{ width: size, height: size }}
    />
  );
}

function NewExerciseForm({ onCreated }) {
  const [form, setForm] = React.useState({ name: '', muscle_group: '', equipment: '' });
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest('/api/exercises', {
        method: 'POST',
        body: { name: form.name.trim(), muscle_group: form.muscle_group.trim().toLowerCase(), equipment: form.equipment.trim() || null },
      });
      setForm({ name: '', muscle_group: '', equipment: '' });
      onCreated();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 mb-8">
      <h2 className="text-sm font-semibold text-fg mb-3">Add an exercise</h2>
      {error && <div role="alert" className="alert-error mb-3">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="ex-name" className="field-label">Name</label>
          <input id="ex-name" required value={form.name} onChange={set('name')} className="input" />
        </div>
        <div>
          <label htmlFor="ex-group" className="field-label">Muscle group</label>
          <input id="ex-group" required list="muscle-groups" value={form.muscle_group} onChange={set('muscle_group')} className="input" />
          <datalist id="muscle-groups">{MUSCLE_GROUPS.map((g) => <option key={g} value={g} />)}</datalist>
        </div>
        <div>
          <label htmlFor="ex-equipment" className="field-label">Equipment (optional)</label>
          <input id="ex-equipment" value={form.equipment} onChange={set('equipment')} className="input" />
        </div>
      </div>
      <button type="submit" disabled={saving || !form.name.trim() || !form.muscle_group.trim()} className="btn-primary mt-4">
        {saving ? 'Adding...' : 'Add exercise'}
      </button>
    </form>
  );
}

export default function ExercisesPage() {
  const { status, data, error, reload } = useLoad('/api/exercises');
  const [query, setQuery] = React.useState('');
  const [group, setGroup] = React.useState('all');

  const filtered = React.useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((exercise) => (
      (group === 'all' || exercise.muscle_group === group) &&
      (!q || exercise.name.toLowerCase().includes(q))
    ));
  }, [data, query, group]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-6 sm:pt-10">
      <h1 className="font-display text-[38px] font-extrabold leading-none tracking-tight mb-6">Exercises</h1>
      <NewExerciseForm onCreated={reload} />

      {status === 'loading' && <Loading label="Loading exercises" />}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ready' && data.length === 0 && (
        <div className="card p-6 text-sm text-fg-mute">No exercises yet. Add your first one above.</div>
      )}
      {status === 'ready' && data.length > 0 && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises"
              aria-label="Search exercises"
              className="input sm:max-w-xs"
            />
            <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Filter by muscle group" className="input sm:max-w-[10rem]">
              <option value="all">All muscle groups</option>
              {MUSCLE_GROUPS.map((g) => <option key={g} value={g} className="capitalize">{g}</option>)}
            </select>
            <span className="text-xs text-fg-mute sm:ml-auto">{filtered.length} of {data.length}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="card p-6 text-sm text-fg-mute">No exercises match that search.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-ink-700">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Exercise library</caption>
                <thead className="bg-ink-900 text-xs uppercase tracking-wide text-fg-mute">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Name</th>
                    <th scope="col" className="px-4 py-2 font-medium">Muscle group</th>
                    <th scope="col" className="px-4 py-2 font-medium">Equipment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700">
                  {filtered.map((exercise) => (
                    <tr key={exercise.id}>
                      <td className="px-4 py-2">
                        <Link to={`/exercises/${exercise.id}`} className="flex items-center gap-3 text-fg hover:text-accent hover:no-underline">
                          <ExerciseLogo exercise={exercise} />
                          {exercise.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-fg-soft capitalize">{exercise.muscle_group}</td>
                      <td className="px-4 py-2 text-fg-mute">{exercise.equipment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
