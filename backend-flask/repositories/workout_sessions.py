from lib.db import query_array_json


class WorkoutSessions:
  def run(user_id):
    sql = """
      SELECT id, user_id, started_at, completed_at, notes, created_at
      FROM public.workout_sessions
      WHERE user_id = %s
      ORDER BY started_at DESC
    """
    return query_array_json(sql, (user_id,))
