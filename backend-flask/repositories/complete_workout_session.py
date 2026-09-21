from lib.db import execute


class CompleteWorkoutSession:
  # Scoped to user_id -- returns None both when the session doesn't exist
  # and when it belongs to someone else, so callers can't tell the two apart.
  def run(session_id, user_id, completed_at=None, notes=None, conn=None):
    return execute(
      """
      UPDATE public.workout_sessions
      SET completed_at = COALESCE(%s, current_timestamp),
          notes = COALESCE(%s, notes)
      WHERE id = %s AND user_id = %s
      RETURNING id, user_id, started_at, completed_at, notes, created_at
      """,
      (completed_at, notes, session_id, user_id),
      conn=conn
    )
