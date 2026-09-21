import React from 'react';
import { Link } from 'react-router-dom';

import NavBar from '../components/NavBar';
import TeamBadge from '../components/TeamBadge';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';
import { elapsedMinute, statusLabel } from '../lib/matchTime';

const SOON_MS = 2 * 60 * 60 * 1000;

export default function FollowingPage() {
  const [matches, setMatches] = React.useState([]);
  const [teams, setTeams] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const user = useAuthUser();

  React.useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch('/api/matches?followed=true').then((res) => res.json()),
      apiFetch('/api/teams?followed=true').then((res) => res.json()),
    ])
      .then(([matchesData, teamsData]) => {
        setMatches(matchesData);
        setTeams(teamsData);
      })
      .catch(() => setError('Could not load what you follow.'))
      .finally(() => setLoading(false));
  }, [user]);

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

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold mb-6">Following</h1>

        {!user && <p className="text-gray-500">Sign in to follow teams and matches.</p>}
        {user && error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-950 border border-red-900 text-red-300 text-sm">
            {error}
          </div>
        )}
        {user && loading && <p className="text-gray-500">Loading...</p>}

        {user && !loading && (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-3">Followed Matches</h2>
              {matches.length === 0 ? (
                <p className="text-gray-500">You aren't following any matches yet.</p>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
                  {matches.map((match) => {
                    const elapsed = elapsedMinute(match.kickoff_time, match.status) ?? match.elapsed_minute;
                    const kickoffMs = new Date(match.kickoff_time).getTime();
                    const startingSoon = match.status === 'scheduled' && kickoffMs - Date.now() < SOON_MS;
                    return (
                      <Link
                        key={match.uuid}
                        to={`/matches/${match.uuid}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="font-medium">
                          {match.home_team_abbreviation} {match.home_score} - {match.away_score} {match.away_team_abbreviation}
                        </span>
                        <span className="text-sm">
                          {(match.status === 'live' || match.status === 'half_time') && (
                            <span className="inline-flex items-center gap-1.5 text-red-400 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE NOW
                            </span>
                          )}
                          {startingSoon && <span className="text-emerald-400 font-semibold">Starting soon</span>}
                          {!startingSoon && match.status !== 'live' && match.status !== 'half_time' && (
                            <span className="text-gray-500">{statusLabel(match.status, elapsed)}</span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">Followed Teams</h2>
              {teams.length === 0 ? (
                <p className="text-gray-500">You aren't following any teams yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teams.map((team) => (
                    <Link
                      key={team.uuid}
                      to={`/teams/${team.uuid}`}
                      className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-emerald-600 transition-colors"
                    >
                      <TeamBadge abbreviation={team.abbreviation} />
                      <span className="font-medium truncate">{team.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
