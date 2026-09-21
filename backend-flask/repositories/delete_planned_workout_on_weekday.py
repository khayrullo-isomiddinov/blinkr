from lib.db import execute


class DeletePlannedWorkoutOnWeekday:
  def run(plan_id, weekday, conn=None):
    execute(
      "DELETE FROM public.planned_workouts WHERE training_plan_id = %s AND weekday = %s",
      (plan_id, weekday), conn=conn
    )
