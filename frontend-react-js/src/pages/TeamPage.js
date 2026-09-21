import React from 'react';
import { Link, useParams } from 'react-router-dom';

import NavBar from '../components/NavBar';
import TeamBadge from '../components/TeamBadge';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';
import { formatKickoff } from '../lib/matchTime';

export default function TeamPage() {
  const { teamId } = useParams();
  const [team, setTeam] = React.useState(null);
  const [following, setFollowing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notFound, setNotFound] = React.useState(false);
  const user = useAuthUser();

  React.useEffect(() => {
    apiFetch(`/api/teams/${teamId}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then((data) => { if (data) setTeam(data); })
      .catch(() => setError('Could not load this team.'));
  }, [teamId]);

  React.useEffect(() => {
    if (!user) return;
    apiFetch('/api/teams?followed=true')
      .then((res) => res.json())
      .then((followed) => setFollowing(followed.some((t) => t.uuid === teamId)))
      .catch((err) => console.log(err));
  }, [user, teamId]);

  const toggleFollow = async () => {
    try {
      const res = await apiFetch(`/api/teams/${teamId}/follow`, { method: following ? 'DELETE' : 'POST' });
      if (res.ok) setFollowing(!following);
    } catch (err) {
      console.log(err);
    }
  };

  const doSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (err) {
      console.log('error signing out: ', err);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950">
        <NavBar user={user} onSignOut={doSignOut} />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-gray-400">This team doesn't exist.</p>
        </main>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-950">
        <NavBar user={user} onSignOut={doSignOut} />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-gray-500">{error || 'Loading team...'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar user={user} onSignOut={doSignOut} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-950 border border-red-900 text-red-300 text-sm">
            {error}
          </div>
        )}

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 flex items-center gap-4">
          <TeamBadge abbreviation={team.abbreviation} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold truncate">{team.name}</h1>
            <p className="text-gray-500">{team.country}</p>
          </div>
          {user && (
            <button
              onClick={toggleFollow}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 ${
                following ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">Matches</h2>
          {team.matches.length === 0 ? (
            <p className="text-gray-500">No matches scheduled.</p>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
              {team.matches.map((match) => (
                <Link
                  key={match.uuid}
                  to={`/matches/${match.uuid}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  <span className="font-medium">
                    {match.home_team_abbreviation} {match.home_score} - {match.away_score} {match.away_team_abbreviation}
                  </span>
                  <span className="text-sm text-gray-500 text-right">
                    {match.status === 'scheduled' ? formatKickoff(match.kickoff_time) : match.status}
                    {' · '}{match.competition}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
