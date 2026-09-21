const pad = (n) => String(n).padStart(2, '0');

export function formatDay(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatClock(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDuration(start, end) {
  const minutes = Math.round((new Date(end) - new Date(start)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

// mm:ss under an hour, h:mm:ss after
export function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
