import React from 'react';
import { apiRequest } from '../../../lib/api';

const isCount = (value) => Number.isInteger(value) && value >= 0;

// Anything that isn't the documented shape is treated as a failed load, never rendered half-broken.
function isOverview(data) {
  return Boolean(
    data
    && isCount(data.users?.total)
    && isCount(data.workouts?.total) && isCount(data.workouts?.completed)
    && isCount(data.exercises?.total)
    && isCount(data.events?.total) && isCount(data.events?.published)
    && isCount(data.events?.pending) && isCount(data.events?.failed_attempts)
    && Array.isArray(data.recent_activity)
  );
}

const number = new Intl.NumberFormat('en-US');

function formatTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded border border-gray-800 bg-gray-900 p-4">
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={`mt-2 text-2xl font-semibold tabular-nums ${tone || 'text-gray-100'}`}>{number.format(value)}</dd>
    </div>
  );
}

function Skeleton() {
  const block = (key) => <div key={key} className="h-[5.5rem] rounded border border-gray-800 bg-gray-900" />;
  return (
    <div role="status" aria-busy="true" className="space-y-8">
      <span className="sr-only">Loading overview</span>
      <div aria-hidden="true" className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-pulse">{[0, 1, 2, 3].map(block)}</div>
      <div aria-hidden="true" className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-pulse">{[4, 5, 6, 7].map(block)}</div>
      <div aria-hidden="true" className="h-40 rounded border border-gray-800 bg-gray-900 animate-pulse" />
    </div>
  );
}

function RecentActivity({ rows }) {
  return (
    <section aria-labelledby="recent-activity-heading">
      <h2 id="recent-activity-heading" className="text-sm font-semibold text-gray-200 mb-3">Recent activity</h2>
      {rows.length === 0 ? (
        <p className="rounded border border-gray-800 bg-gray-900 p-4 text-sm text-gray-400">
          No completed workouts yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-800">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Most recently completed workouts</caption>
            <thead className="bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Workout session</th>
                <th scope="col" className="px-4 py-2 font-medium">User</th>
                <th scope="col" className="px-4 py-2 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((row) => (
                <tr key={row.workout_session_id}>
                  <td className="px-4 py-2 font-mono text-xs text-gray-200 whitespace-nowrap">{row.workout_session_id}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400 whitespace-nowrap">{row.user_id}</td>
                  <td className="px-4 py-2 text-gray-300 whitespace-nowrap">
                    <time dateTime={row.completed_at}>{formatTime(row.completed_at)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function OverviewPage() {
  const [state, setState] = React.useState({ status: 'loading', data: null });
  const [refreshing, setRefreshing] = React.useState(false);
  const [request, setRequest] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    apiRequest('/api/admin/overview')
      .then((data) => {
        if (cancelled) return;
        setState(isOverview(data) ? { status: 'ready', data } : { status: 'error', data: null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', data: null });
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  const reload = () => setRequest((n) => n + 1);

  const refresh = () => {
    setRefreshing(true);
    reload();
  };

  const retry = () => {
    setState({ status: 'loading', data: null });
    reload();
  };

  const { status, data } = state;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Overview</h1>
          <p className="text-sm text-gray-400 max-w-2xl">Operational view of the Blinkr workout platform.</p>
        </div>
        {status === 'ready' && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500" aria-live="polite">
              {refreshing ? 'Refreshing...' : `Updated ${formatTime(data.generated_at)}`}
            </p>
            <button type="button" onClick={refresh} disabled={refreshing} className="btn-secondary">Refresh</button>
          </div>
        )}
      </div>

      {status === 'loading' && <Skeleton />}

      {status === 'error' && (
        <div role="alert" className="rounded border border-gray-800 bg-gray-900 p-6 max-w-xl">
          <h2 className="text-base font-semibold mb-1">Overview unavailable</h2>
          <p className="text-sm text-gray-400 mb-4">The overview could not be loaded. Try again in a moment.</p>
          <button type="button" onClick={retry} className="btn-secondary">Retry</button>
        </div>
      )}

      {status === 'ready' && (
        <div className="space-y-8">
          <section aria-labelledby="platform-heading">
            <h2 id="platform-heading" className="text-sm font-semibold text-gray-200 mb-3">Platform</h2>
            <dl className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Stat label="Users" value={data.users.total} />
              <Stat label="Workouts" value={data.workouts.total} />
              <Stat label="Completed workouts" value={data.workouts.completed} />
              <Stat label="Exercises" value={data.exercises.total} />
            </dl>
          </section>

          <section aria-labelledby="events-heading">
            <h2 id="events-heading" className="text-sm font-semibold text-gray-200 mb-3">Events (outbox)</h2>
            <dl className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Stat label="Total events" value={data.events.total} />
              <Stat label="Published" value={data.events.published} />
              <Stat label="Pending" value={data.events.pending} />
              <Stat label="Events with attempts" value={data.events.failed_attempts} tone={data.events.failed_attempts > 0 ? 'text-amber-400' : undefined} />
            </dl>
          </section>

          <RecentActivity rows={data.recent_activity} />
        </div>
      )}
    </div>
  );
}
