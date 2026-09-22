from lib.db import query_array_json


class ShowExercise:
  def run(exercise_id):
    rows = query_array_json(
      """
      SELECT id, name, muscle_group, equipment, created_at
      FROM public.exercises
      WHERE id = %s
      """,
      (exercise_id,)
    )
    if not rows:
      return None
    return rows[0]
