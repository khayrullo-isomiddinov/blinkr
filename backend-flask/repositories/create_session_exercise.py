from lib.db import execute


class CreateSessionExercise:
  def run(session_id, exercise_id, exercise_order, notes=None):
    return execute(
      """
      INSERT INTO public.session_exercises (session_id, exercise_id, exercise_order, notes)
      VALUES (%s, %s, %s, %s)
      RETURNING id, session_id, exercise_id, exercise_order, notes
      """,
      (session_id, exercise_id, exercise_order, notes)
    )
