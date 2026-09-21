from lib.db import query_array_json


class SessionExercises:
  def run(session_id):
    sql = """
      SELECT
        session_exercises.id,
        session_exercises.session_id,
        session_exercises.exercise_id,
        session_exercises.exercise_order,
        session_exercises.notes,
        exercises.name AS exercise_name,
        exercises.muscle_group AS exercise_muscle_group
      FROM public.session_exercises
      JOIN public.exercises ON exercises.id = session_exercises.exercise_id
      WHERE session_exercises.session_id = %s
      ORDER BY session_exercises.exercise_order
    """
    return query_array_json(sql, (session_id,))
