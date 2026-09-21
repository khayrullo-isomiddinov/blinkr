import React from 'react';
import { Link } from 'react-router-dom';

import NavBar from '../components/NavBar';
import TeamBadge from '../components/TeamBadge';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';

export default function BrowsePage() {
  const [teams, setTeams] = React.useState([]);
  const [matches, setMatches] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const dataFetchedRef = React.useRef(false);
  const user = useAuthUser();

  React.useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    Promise.all([
      apiFetch('/api/teams').then((res) => res.json()),
      apiFetch('/api/matches').then((res) => res.json()),
    ])
      .then(([teamsData, matchesData]) => {
        setTeams(teamsData);
        setMatches(matchesData);
      })
      .catch(() => setError('Could not load teams and matches.'))
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="text-2xl font-extrabold mb-6">Browse</h1>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-950 border border-red-900 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-3">Teams</h2>
              {teams.length === 0 ? (
                <p className="text-gray-500">No teams found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teams.map((team) => (
                    <Link
                      key={team.uuid}
                      to={`/teams/${team.uuid}`}
                      className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-emerald-600 transition-colors"
                    >
                      <TeamBadge abbreviation={team.abbreviation} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{team.name}</div>
                        <div className="text-sm text-gray-500">{team.country}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">All Matches</h2>
              {matches.length === 0 ? (
                <p className="text-gray-500">No matches found.</p>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
                  {matches.map((match) => (
                    <Link
                      key={match.uuid}
                      to={`/matches/${match.uuid}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="font-medium">
                        {match.home_team_abbreviation} {match.home_score} - {match.away_score} {match.away_team_abbreviation}
                      </span>
                      <span className="text-sm text-gray-500">{match.status} · {match.competition}</span>
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
