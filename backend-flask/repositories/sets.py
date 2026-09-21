from lib.db import query_array_json


class Sets:
  def run(session_exercise_id):
    sql = """
      SELECT id, session_exercise_id, set_order, reps, weight, weight_unit, set_type, created_at
      FROM public.sets
      WHERE session_exercise_id = %s
      ORDER BY set_order
    """
    return query_array_json(sql, (session_exercise_id,))
