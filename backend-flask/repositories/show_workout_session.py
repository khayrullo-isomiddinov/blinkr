from lib.db import query_array_json


class ShowWorkoutSession:
  # Scoped to a specific user_id -- a session belongs to whoever started it,
  # so looking one up always requires proving ownership via user_id, not just
  # knowing its id.
  def run(session_id, user_id):
    sessions = query_array_json(
      """
      SELECT id, user_id, started_at, completed_at, notes, created_at
      FROM public.workout_sessions
      WHERE id = %s AND user_id = %s
      """,
      (session_id, user_id)
    )
    if not sessions:
      return None

    session = sessions[0]

    session_exercises = query_array_json(
      """
      SELECT
        session_exercises.id,
        session_exercises.exercise_id,
        session_exercises.exercise_order,
        session_exercises.notes,
        exercises.name AS exercise_name,
        exercises.muscle_group AS exercise_muscle_group
      FROM public.session_exercises
      JOIN public.exercises ON exercises.id = session_exercises.exercise_id
      WHERE session_exercises.session_id = %s
      ORDER BY session_exercises.exercise_order
      """,
      (session_id,)
    )

    for session_exercise in session_exercises:
      session_exercise['sets'] = query_array_json(
        """
        SELECT id, set_order, reps, weight, weight_unit, set_type, created_at
        FROM public.sets
        WHERE session_exercise_id = %s
        ORDER BY set_order
        """,
        (session_exercise['id'],)
      )

    session['session_exercises'] = session_exercises
    return session
