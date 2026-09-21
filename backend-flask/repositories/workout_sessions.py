from lib.db import query_array_json


class WorkoutSessions:
  # `start` / `end` (optional): only sessions that began in [start, end). Used by the calendar for one local week.
  def run(user_id, start=None, end=None):
    sql = """
      SELECT id, user_id, started_at, completed_at, notes, planned_workout_id, plan_name, created_at
      FROM public.workout_sessions
      WHERE user_id = %s
    """
    params = [user_id]
    if start is not None:
      sql += " AND started_at >= %s"
      params.append(start)
    if end is not None:
      sql += " AND started_at < %s"
      params.append(end)
    sql += " ORDER BY started_at DESC"
    return query_array_json(sql, tuple(params))
