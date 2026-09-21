from lib.db import query_array_json


class ShowWorkoutSession:
  # Scoped to a specific user_id -- a session belongs to whoever started it,
  # so looking one up always requires proving ownership via user_id, not just
  # knowing its id.
  def run(session_id, user_id):
    sessions = query_array_json(
      """
      SELECT id, user_id, started_at, completed_at, notes, planned_workout_id, plan_name, created_at
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
        session_exercises.target_sets,
        session_exercises.target_reps_min,
        session_exercises.target_reps_max,
        session_exercises.target_weight,
        session_exercises.target_weight_unit,
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
      session_exercise['last_time'] = ShowWorkoutSession._last_time(user_id, session_exercise['exercise_id'], session_id, session['started_at'])
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

  # The sets from the most recent earlier, completed workout that included this exercise, or None.
  def _last_time(user_id, exercise_id, session_id, before):
    rows = query_array_json(
      """
      SELECT ws.started_at AS performed_at, s.set_order, s.reps, s.weight, s.weight_unit, s.set_type
      FROM public.sets s
      JOIN public.session_exercises se ON se.id = s.session_exercise_id
      JOIN public.workout_sessions ws ON ws.id = se.session_id
      WHERE se.exercise_id = %s
        AND se.session_id = (
          SELECT ws2.id
          FROM public.workout_sessions ws2
          JOIN public.session_exercises se2 ON se2.session_id = ws2.id
          WHERE ws2.user_id = %s AND se2.exercise_id = %s AND ws2.id <> %s
            AND ws2.completed_at IS NOT NULL AND ws2.started_at < %s
            AND EXISTS (SELECT 1 FROM public.sets s2 WHERE s2.session_exercise_id = se2.id)
          ORDER BY ws2.started_at DESC
          LIMIT 1
        )
      ORDER BY s.set_order
      """,
      (exercise_id, user_id, exercise_id, session_id, before)
    )
    if not rows:
      return None
    return {
      'performed_at': rows[0]['performed_at'],
      'sets': [{k: row[k] for k in ('set_order', 'reps', 'weight', 'weight_unit', 'set_type')} for row in rows],
    }
