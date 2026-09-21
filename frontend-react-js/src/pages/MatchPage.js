import React from 'react';
import { useParams } from 'react-router-dom';

import NavBar from '../components/NavBar';
import TeamBadge from '../components/TeamBadge';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';
import { elapsedMinute, statusLabel, formatKickoff } from '../lib/matchTime';

const EVENT_STYLES = {
  GOAL: { icon: '⚽', label: 'GOAL', color: 'text-emerald-400' },
  YELLOW_CARD: { icon: '🟨', label: 'YELLOW CARD', color: 'text-yellow-400' },
  RED_CARD: { icon: '🟥', label: 'RED CARD', color: 'text-red-400' },
  SUBSTITUTION: { icon: '🔄', label: 'SUBSTITUTION', color: 'text-sky-400' },
  HALF_TIME: { icon: '⏸', label: 'HALF-TIME', color: 'text-gray-400' },
  FULL_TIME: { icon: '⏹', label: 'FULL-TIME', color: 'text-gray-400' },
};

function EventRow({ event }) {
  const style = EVENT_STYLES[event.event_type] || { icon: '•', label: event.event_type, color: 'text-gray-400' };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-800">
      <div className="w-10 shrink-0 text-right text-sm font-mono text-gray-500">{event.minute}'</div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 ${style.color}`}>
          <span>{style.icon}</span> {style.label}
          {event.team_abbreviation && <span className="text-gray-500 font-normal normal-case">({event.team_abbreviation})</span>}
        </div>
        {(event.player_name || event.detail) && (
          <div className="text-sm text-gray-300 mt-0.5">
            {event.player_name}{event.player_name && event.detail && ' - '}{event.detail}
          </div>
        )}
      </div>
    </div>
  );
}

function ReactionRow({ reaction }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-800">
      <div className="w-8 h-8 shrink-0 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
        {(reaction.display_name || reaction.handle || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-semibold text-gray-100">{reaction.display_name || reaction.handle}</span>
          <span className="text-gray-500"> @{reaction.handle}</span>
        </div>
        <div className="text-gray-200 mt-0.5">{reaction.message}</div>
      </div>
    </div>
  );
}

export default function MatchPage() {
  const { matchId } = useParams();
  const [match, setMatch] = React.useState(null);
  const [events, setEvents] = React.useState([]);
  const [reactions, setReactions] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const [following, setFollowing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [postError, setPostError] = React.useState('');
  const [notFound, setNotFound] = React.useState(false);
  const user = useAuthUser();

  const loadMatch = React.useCallback(async () => {
    try {
      const [matchRes, eventsRes, reactionsRes] = await Promise.all([
        apiFetch(`/api/matches/${matchId}`),
        apiFetch(`/api/matches/${matchId}/events`),
        apiFetch(`/api/matches/${matchId}/reactions`),
      ]);
      if (matchRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (!matchRes.ok || !eventsRes.ok || !reactionsRes.ok) {
        throw new Error('Request failed');
      }
      setMatch(await matchRes.json());
      setEvents(await eventsRes.json());
      setReactions(await reactionsRes.json());
      setError('');
    } catch (err) {
      setError('Could not load this match. Retrying shortly...');
    }
  }, [matchId]);

  React.useEffect(() => {
    loadMatch();
    const interval = setInterval(loadMatch, 10000);
    return () => clearInterval(interval);
  }, [loadMatch]);

  React.useEffect(() => {
    if (!user) return;
    apiFetch('/api/matches?followed=true')
      .then((res) => res.json())
      .then((followed) => setFollowing(followed.some((m) => m.uuid === matchId)))
      .catch((err) => console.log(err));
  }, [user, matchId]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    setPostError('');
    try {
      const res = await apiFetch(`/api/matches/${matchId}/reactions`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (res.status === 200) {
        setReactions((current) => [...current, data]);
        setMessage('');
      } else {
        setPostError('Could not post your reaction -- please try again.');
      }
    } catch (err) {
      setPostError('Could not post your reaction -- please try again.');
    }
  };

  const toggleFollow = async () => {
    try {
      const res = await apiFetch(`/api/matches/${matchId}/follow`, { method: following ? 'DELETE' : 'POST' });
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
        <main className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-gray-400">This match doesn't exist.</p>
        </main>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950">
        <NavBar user={user} onSignOut={doSignOut} />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-gray-500">{error || 'Loading match...'}</p>
        </main>
      </div>
    );
  }

  const elapsed = elapsedMinute(match.kickoff_time, match.status) ?? match.elapsed_minute;
  const kickoffMs = new Date(match.kickoff_time).getTime();
  const isLive = match.status === 'live' || match.status === 'half_time';

  const timeline = [
    ...events.map((e) => ({
      timestamp: kickoffMs + e.minute * 60000,
      key: `event-${e.uuid}`,
      node: <EventRow key={`event-${e.uuid}`} event={e} />,
    })),
    ...reactions.map((r) => ({
      timestamp: new Date(r.created_at).getTime(),
      key: `reaction-${r.uuid}`,
      node: <ReactionRow key={`reaction-${r.uuid}`} reaction={r} />,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar user={user} onSignOut={doSignOut} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-950 border border-red-900 text-red-300 text-sm">
            {error}
          </div>
        )}

        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
            <span>{match.competition}</span>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950 text-red-400 font-bold uppercase tracking-wide text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {statusLabel(match.status, elapsed)}
              </span>
            ) : (
              <span className="font-semibold uppercase tracking-wide text-xs">
                {match.status === 'scheduled' ? formatKickoff(match.kickoff_time) : statusLabel(match.status, elapsed)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <TeamBadge abbreviation={match.home_team_abbreviation} size="lg" />
              <span className="font-semibold text-center truncate w-full">{match.home_team_name}</span>
            </div>
            <div className="text-4xl font-extrabold tabular-nums px-2">
              {match.home_score} - {match.away_score}
            </div>
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <TeamBadge abbreviation={match.away_team_abbreviation} size="lg" />
              <span className="font-semibold text-center truncate w-full">{match.away_team_name}</span>
            </div>
          </div>

          {user && (
            <button
              onClick={toggleFollow}
              className={`mt-5 w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                following ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {following ? 'Following this match' : 'Follow this match'}
            </button>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-1">Live Timeline</h2>
          <p className="text-sm text-gray-500 mb-3">
            Official events and fan reactions, in order. Reactions are temporary -- they expire after the match.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4">
            {timeline.length === 0 ? (
              <p className="py-6 text-center text-gray-500">Nothing happening yet.</p>
            ) : (
              timeline.map((item) => item.node)
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">Post a Reaction</h2>
          {user ? (
            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="What's happening?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600"
              >
                Post
              </button>
            </form>
          ) : (
            <p className="text-gray-500 italic">Sign in to post a reaction.</p>
          )}
          {postError && <p className="mt-2 text-sm text-red-400">{postError}</p>}
        </section>
      </main>
    </div>
  );
}
