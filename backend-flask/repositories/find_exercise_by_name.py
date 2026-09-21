from lib.db import query_array_json


class FindExerciseByName:
  def run(name):
    rows = query_array_json(
      """
      SELECT id, name, muscle_group, equipment, created_at
      FROM public.exercises
      WHERE name = %s
      """,
      (name,)
    )
    if not rows:
      return None
    return rows[0]
