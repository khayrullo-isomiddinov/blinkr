import React from 'react';
import { apiRequest } from '../lib/api';
import { describeApiError } from '../lib/apiErrors';
import { useLoad } from '../lib/useLoad';
import { Loading, LoadError } from './PageState';
import { cardClass, inputClass, labelClass, primaryButton, errorBox } from '../lib/ui';

const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

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
    <form onSubmit={submit} className={`${cardClass} p-4 mb-8`}>
      <h2 className="text-sm font-semibold text-gray-200 mb-3">Add an exercise</h2>
      {error && <div role="alert" className={`${errorBox} mb-3`}>{error}</div>}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="ex-name" className={labelClass}>Name</label>
          <input id="ex-name" required value={form.name} onChange={set('name')} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ex-group" className={labelClass}>Muscle group</label>
          <input id="ex-group" required list="muscle-groups" value={form.muscle_group} onChange={set('muscle_group')} className={inputClass} />
          <datalist id="muscle-groups">{MUSCLE_GROUPS.map((g) => <option key={g} value={g} />)}</datalist>
        </div>
        <div>
          <label htmlFor="ex-equipment" className={labelClass}>Equipment (optional)</label>
          <input id="ex-equipment" value={form.equipment} onChange={set('equipment')} className={inputClass} />
        </div>
      </div>
      <button type="submit" disabled={saving || !form.name.trim() || !form.muscle_group.trim()} className={`${primaryButton} mt-4`}>
        {saving ? 'Adding...' : 'Add exercise'}
      </button>
    </form>
  );
}

export default function ExercisesPage() {
  const { status, data, error, reload } = useLoad('/api/exercises');

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Exercises</h1>
      <NewExerciseForm onCreated={reload} />

      {status === 'loading' && <Loading label="Loading exercises" />}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ready' && data.length === 0 && (
        <div className={`${cardClass} p-6 text-sm text-gray-400`}>No exercises yet. Add your first one above.</div>
      )}
      {status === 'ready' && data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Exercise library</caption>
            <thead className="bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Name</th>
                <th scope="col" className="px-4 py-2 font-medium">Muscle group</th>
                <th scope="col" className="px-4 py-2 font-medium">Equipment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.map((exercise) => (
                <tr key={exercise.id}>
                  <td className="px-4 py-2 text-gray-100">{exercise.name}</td>
                  <td className="px-4 py-2 text-gray-300 capitalize">{exercise.muscle_group}</td>
                  <td className="px-4 py-2 text-gray-400">{exercise.equipment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
