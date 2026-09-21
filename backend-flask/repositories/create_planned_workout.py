from lib.db import query_array_json


class CreatePlannedWorkout:
  def run(plan_id, weekday, name, notes, conn=None):
    return query_array_json(
      """
      INSERT INTO public.planned_workouts (training_plan_id, weekday, name, notes)
      VALUES (%s, %s, %s, %s)
      RETURNING id, training_plan_id, weekday, name, notes
      """,
      (plan_id, weekday, name, notes), conn=conn
    )[0]
