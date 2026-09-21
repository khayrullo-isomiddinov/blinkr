from lib.db import execute


class CreateWorkoutSession:
  def run(user_id, started_at=None, notes=None):
    return execute(
      """
      INSERT INTO public.workout_sessions (user_id, started_at, notes)
      VALUES (%s, COALESCE(%s, current_timestamp), %s)
      RETURNING id, user_id, started_at, completed_at, notes, created_at
      """,
      (user_id, started_at, notes)
    )
