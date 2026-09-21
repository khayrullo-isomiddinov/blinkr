from lib.db import query_array_json

FIELDS = ('name', 'notes', 'weekday')


class UpdatePlannedWorkout:
  # `changes` may only carry FIELDS; the column names come from that whitelist, never from the request.
  def run(user_id, workout_id, changes, conn=None):
    assignments = [f'{field} = %s' for field in FIELDS if field in changes]
    params = [changes[field] for field in FIELDS if field in changes]
    assignments.append('updated_at = current_timestamp')
    rows = query_array_json(
      f"""
      UPDATE public.planned_workouts pw SET {', '.join(assignments)}
      FROM public.training_plans tp
      WHERE pw.id = %s AND tp.id = pw.training_plan_id AND tp.user_id = %s
      RETURNING pw.id
      """,
      tuple(params) + (workout_id, user_id), conn=conn
    )
    return rows[0] if rows else None
