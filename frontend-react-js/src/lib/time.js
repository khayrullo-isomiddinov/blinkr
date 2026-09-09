// The backend returns timestamps as either ISO 8601 (synthetic rows) or
// RFC 1123 / HTTP-date (real Postgres rows serialized by Flask's JSON
// provider) -- native Date parses both, luxon's fromISO does not.
export function relativeTime(dateString) {
  const then = new Date(dateString);
  if (isNaN(then.getTime())) return '';
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
