// Weekday convention, the same as the backend: 0 = Monday ... 6 = Sunday. Weeks start on Monday.
// Dates are local to the browser, like every other time in the app; the API only ever sees timestamps.
export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const weekdayOf = (date) => (date.getDay() + 6) % 7;

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Built from calendar parts, so it stays on local midnight across daylight-saving changes.
export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfWeek(date) {
  return addDays(startOfDay(date), -weekdayOf(date));
}

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'YYYY-MM-DD' -> local Date, or null when it is not a real date.
export function parseDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dateKey(date) === key ? date : null;
}

export function weekLabel(start) {
  const end = addDays(start, 6);
  const month = (d) => d.toLocaleDateString([], { month: 'short' });
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()}–${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

export function longDate(date) {
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

// "3 × 6–8 · 80 kg", "3 × 8", or "3 sets" when no reps are planned.
export function formatTarget(exercise) {
  const { target_sets: sets, target_reps_min: min, target_reps_max: max, target_weight: weight, target_weight_unit: unit } = exercise;
  if (!sets) return '';
  let text = min == null ? `${sets} ${sets === 1 ? 'set' : 'sets'}` : `${sets} × ${max ? `${min}–${max}` : min}`;
  if (weight != null) text += ` · ${Number(weight)} ${unit}`;
  return text;
}

export function totalSets(exercises) {
  return exercises.reduce((total, e) => total + (e.target_sets || 0), 0);
}

// A rough duration for the "Today" panel: about three minutes a set plus five to get started.
export function estimateMinutes(exercises) {
  const sets = totalSets(exercises);
  return sets === 0 ? null : Math.max(10, Math.round((sets * 3 + 5) / 5) * 5);
}

// "Chest · Shoulders · Triceps" -- the muscle groups actually trained, in the order they first appear.
export function muscleGroupLine(exercises, limit = 3) {
  const seen = [];
  exercises.forEach((e) => {
    const group = e.exercise_muscle_group;
    if (group && !seen.includes(group)) seen.push(group);
  });
  if (seen.length === 0) return '';
  const shown = seen.slice(0, limit).map((g) => g.charAt(0).toUpperCase() + g.slice(1));
  const rest = seen.length - shown.length;
  return rest > 0 ? `${shown.join(' · ')} +${rest}` : shown.join(' · ');
}

// "4 exercises · 12 sets · ~35 min"
export function workoutSummaryLine(exercises, { withEstimate = true } = {}) {
  if (exercises.length === 0) return 'No exercises yet';
  const sets = totalSets(exercises);
  const parts = [`${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'}`];
  if (sets > 0) parts.push(`${sets} sets`);
  if (withEstimate) {
    const minutes = estimateMinutes(exercises);
    if (minutes) parts.push(`~${minutes} min`);
  }
  return parts.join(' · ');
}

export function sessionsOn(sessions, date) {
  const key = dateKey(date);
  return sessions.filter((s) => dateKey(new Date(s.started_at)) === key);
}

// What happened on one date. `sessions` are the ones that began that day. Status is derived, never stored:
//   rest         no planned workout for this weekday
//   completed    a session started from this planned workout finished
//   in_progress  one started from it is still open
//   missed       planned, the day is over, nothing was started
//   planned      planned, still to do
// Workouts that were not started from today's plan (ad-hoc, or from a since-deleted plan) come back as `extras`.
export function dayState({ planned, sessions, date, today }) {
  const linked = planned ? sessions.filter((s) => s.planned_workout_id === planned.id) : [];
  const finished = linked.find((s) => s.completed_at);
  const open = linked.find((s) => !s.completed_at);
  let status = 'planned';
  if (!planned) status = 'rest';
  else if (finished) status = 'completed';
  else if (open) status = 'in_progress';
  else if (date.getTime() < today.getTime()) status = 'missed';
  return { status, session: finished || open || null, extras: sessions.filter((s) => !linked.includes(s)) };
}
