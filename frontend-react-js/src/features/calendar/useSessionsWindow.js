import { useLoad } from '../../lib/useLoad';
import { addDays, startOfDay, startOfWeek } from '../../lib/calendar';

const WEEKS_BACK = 12;
const WEEKS_FORWARD = 13;

// One wide, stable window of sessions (about six months around today) instead of a request per week or day.
// Moving between weeks and days inside it needs no network at all, so nothing reloads or jumps.
// Far outside it the window re-centres on the viewed week, and the old data stays on screen until the new arrives.
export function useSessionsWindow(viewed) {
  const thisWeek = startOfWeek(startOfDay(new Date()));
  const viewedWeek = startOfWeek(viewed);
  const inside = viewedWeek >= addDays(thisWeek, -7 * WEEKS_BACK) && viewedWeek <= addDays(thisWeek, 7 * WEEKS_BACK);
  const anchor = inside ? thisWeek : viewedWeek;
  const from = encodeURIComponent(addDays(anchor, -7 * WEEKS_BACK).toISOString());
  const to = encodeURIComponent(addDays(anchor, 7 * WEEKS_FORWARD).toISOString());
  return useLoad(`/api/workout-sessions?from=${from}&to=${to}`, { cache: true, keepPrevious: true });
}
