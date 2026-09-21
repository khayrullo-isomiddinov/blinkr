from lib.db import query_array_json

MAX_LIMIT = 50


class AdminRecentCompletedWorkouts:
  # Ids and timestamps only -- no profile fields, so nothing personal leaves the database.
  def run(limit, conn=None):
    limit = max(1, min(int(limit), MAX_LIMIT))
    sql = """
      SELECT id, user_id, completed_at
      FROM public.workout_sessions
      WHERE completed_at IS NOT NULL
      ORDER BY completed_at DESC, id DESC
      LIMIT %s
    """
    return query_array_json(sql, (limit,), conn=conn)
