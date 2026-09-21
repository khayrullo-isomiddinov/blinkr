// Backend error codes -> plain language. Unknown codes fall back to a generic message, never raw text.
const MESSAGES = {
  name_blank: 'Name is required.',
  muscle_group_blank: 'Muscle group is required.',
  exercise_name_taken: 'An exercise with that name already exists.',
  exercise_id_blank: 'Pick an exercise first.',
  exercise_not_found: 'That exercise no longer exists.',
  exercise_order_taken: 'That exercise position is already taken. Refresh and try again.',
  reps_blank: 'Reps are required.',
  reps_invalid: 'Reps must be a whole number.',
  weight_invalid: 'Weight must be a number.',
  set_invalid: 'That set is not valid (a weight needs a unit, and reps cannot be negative).',
  set_order_taken: 'That set number is already taken. Refresh and try again.',
  workout_session_not_found: 'That workout was not found.',
  session_exercise_not_found: 'That exercise is not part of this workout.',
  avatar_invalid: 'That image could not be used. Try a JPG, PNG or WebP photo.',
  avatar_too_large: 'That image is too large. Try a smaller photo.',
  display_name_invalid: 'Enter a name of up to 50 characters.',
  network_error: 'Could not reach the server. Check your connection and try again.',
  missing_session: 'Your session has ended. Please sign in again.',
};

export function describeApiError(err) {
  const codes = (err && err.errors) || [];
  const known = codes.map((code) => MESSAGES[code]).filter(Boolean);
  return known.length ? known.join(' ') : 'Something went wrong. Please try again.';
}
