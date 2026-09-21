import React from 'react';
import { Link } from 'react-router-dom';

import NavBar from '../components/NavBar';
import TeamBadge from '../components/TeamBadge';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';
import { elapsedMinute, statusLabel, formatKickoff } from '../lib/matchTime';

function StatusPill({ match }) {
  const elapsed = elapsedMinute(match.kickoff_time, match.status) ?? match.elapsed_minute;
  const label = statusLabel(match.status, elapsed);

  if (match.status === 'live' || match.status === 'half_time') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950 text-red-400 text-xs font-bold uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {label}
      </span>
    );
  }
  if (match.status === 'finished') {
    return <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>;
  }
  return <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">{label}</span>;
}

function MatchCard({ match, showKickoff }) {
  return (
    <Link
      to={`/matches/${match.uuid}`}
      className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-emerald-600 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <StatusPill match={match} />
        {showKickoff && match.status === 'scheduled' && (
          <span className="text-xs text-gray-500">{formatKickoff(match.kickoff_time)}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <TeamBadge abbreviation={match.home_team_abbreviation} />
          <span className="truncate font-medium">{match.home_team_name}</span>
        </div>
        <span className="text-xl font-extrabold tabular-nums">{match.home_score}</span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-2">
        <div className="flex items-center gap-3 min-w-0">
          <TeamBadge abbreviation={match.away_team_abbreviation} />
          <span className="truncate font-medium">{match.away_team_name}</span>
        </div>
        <span className="text-xl font-extrabold tabular-nums">{match.away_score}</span>
      </div>
      <div className="mt-3 text-sm font-semibold text-emerald-400">Open Match &rarr;</div>
    </Link>
  );
}

function Section({ title, matches, emptyText, showKickoff }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold mb-3 text-gray-100">{title}</h2>
      {matches.length === 0 ? (
        <p className="text-gray-500">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {matches.map((match) => <MatchCard key={match.uuid} match={match} showKickoff={showKickoff} />)}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [live, setLive] = React.useState([]);
  const [upcoming, setUpcoming] = React.useState([]);
  const [recent, setRecent] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const user = useAuthUser();

  const loadDashboard = React.useCallback(async () => {
    try {
      const [liveRes, upcomingRes, allRes] = await Promise.all([
        apiFetch('/api/matches/live'),
        apiFetch('/api/matches/upcoming'),
        apiFetch('/api/matches'),
      ]);
      if (!liveRes.ok || !upcomingRes.ok || !allRes.ok) {
        throw new Error('Request failed');
      }
      setLive(await liveRes.json());
      setUpcoming(await upcomingRes.json());
      const all = await allRes.json();
      setRecent(all.filter((m) => m.status === 'finished'));
      setError('');
    } catch (err) {
      setError('Could not load matches. Retrying shortly...');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 20000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const doSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (err) {
      console.log('error signing out: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar user={user} onSignOut={doSignOut} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-950 border border-red-900 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading matches...</p>
        ) : (
          <>
            <Section title="Live Now" matches={live} emptyText="No matches live right now." />
            <Section title="Upcoming" matches={upcoming} emptyText="No upcoming matches." showKickoff />
            <Section title="Recent Results" matches={recent} emptyText="No recently finished matches." />
          </>
        )}
      </main>
    </div>
  );
}
