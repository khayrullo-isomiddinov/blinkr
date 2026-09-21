from lib.db import query_array_json


class DeletePlannedWorkout:
  # Sessions already started from it keep their copy; their link just becomes NULL.
  def run(user_id, workout_id, conn=None):
    rows = query_array_json(
      """
      DELETE FROM public.planned_workouts pw
      USING public.training_plans tp
      WHERE pw.id = %s AND tp.id = pw.training_plan_id AND tp.user_id = %s
      RETURNING pw.id
      """,
      (workout_id, user_id), conn=conn
    )
    return rows[0] if rows else None
