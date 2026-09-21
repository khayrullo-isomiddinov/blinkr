import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { useLoad } from '../../lib/useLoad';
import { formatWhen, formatDuration } from '../../lib/format';
import { Loading, LoadError } from '../../components/PageState';

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const { status, data, error, reload } = useLoad('/api/workout-sessions');
  const [starting, setStarting] = React.useState(false);
  const [startError, setStartError] = React.useState('');

  async function start() {
    setStarting(true);
    setStartError('');
    try {
      const session = await apiRequest('/api/workout-sessions', { method: 'POST', body: { started_at: new Date().toISOString() } });
      navigate(`/workouts/${session.id}`);
    } catch (err) {
      setStartError(describeApiError(err));
      setStarting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Workouts</h1>
        <button type="button" onClick={start} disabled={starting} className="btn-primary">
          {starting ? 'Starting...' : 'Start workout'}
        </button>
      </div>
      {startError && <div role="alert" className="alert-error mb-4">{startError}</div>}

      {status === 'loading' && <Loading label="Loading workouts" />}
      {status === 'error' && <LoadError error={error} onRetry={reload} />}
      {status === 'ready' && data.length === 0 && (
        <div className="card p-6 text-sm text-gray-400">No workouts yet. Start your first one above.</div>
      )}
      {status === 'ready' && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((session) => (
            <li key={session.id}>
              <Link to={`/workouts/${session.id}`} className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:border-gray-700">
                <span className="font-medium">{formatWhen(session.started_at)}</span>
                <span className="text-sm text-gray-400">
                  {session.completed_at
                    ? `Completed · ${formatDuration(session.started_at, session.completed_at)}`
                    : <span className="text-amber-400">In progress</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
