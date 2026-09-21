from lib.db import query_array_json


class AdminOverviewCounts:
  # One statement so every count comes from the same snapshot.
  def run(conn=None):
    sql = """
      SELECT
        (SELECT count(*) FROM public.users) AS users_total,
        (SELECT count(*) FROM public.workout_sessions) AS workouts_total,
        (SELECT count(*) FROM public.workout_sessions WHERE completed_at IS NOT NULL) AS workouts_completed,
        (SELECT count(*) FROM public.exercises) AS exercises_total,
        (SELECT count(*) FROM public.outbox_events) AS events_total,
        (SELECT count(*) FROM public.outbox_events WHERE published_at IS NOT NULL) AS events_published,
        (SELECT count(*) FROM public.outbox_events WHERE published_at IS NULL) AS events_pending,
        (SELECT count(*) FROM public.outbox_events WHERE attempts > 0) AS events_with_failed_attempts
    """
    return query_array_json(sql, conn=conn)[0]
