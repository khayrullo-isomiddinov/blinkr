// Client-side companion to time.js's relativeTime -- gives a between-polls
// "LIVE 63'" display without waiting on the backend's own computed value.
export function elapsedMinute(kickoffTimeString, status) {
  if (status !== 'live' && status !== 'half_time') return null;
  const kickoff = new Date(kickoffTimeString);
  if (isNaN(kickoff.getTime())) return null;
  const minutes = Math.floor((Date.now() - kickoff.getTime()) / 60000);
  return Math.max(minutes, 0);
}

export function statusLabel(status, elapsed) {
  if (status === 'live') return elapsed != null ? `LIVE ${elapsed}'` : 'LIVE';
  if (status === 'half_time') return 'HALF-TIME';
  if (status === 'finished') return 'FULL-TIME';
  return 'UPCOMING';
}

// "Today · 20:00" / "Tomorrow · 18:30" / "Tue 23 Sep · 12:00"
export function formatKickoff(kickoffTimeString) {
  const kickoff = new Date(kickoffTimeString);
  if (isNaN(kickoff.getTime())) return '';
  const now = new Date();
  const time = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(kickoff) - startOfDay(now)) / 86400000);

  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  if (diffDays === -1) return `Yesterday · ${time}`;
  const date = kickoff.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return `${date} · ${time}`;
}
