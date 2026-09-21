from lib.db import query_array_json
from repositories.planned_workout_exercises import PlannedWorkoutExercises


class ShowPlannedWorkout:
  # Ownership lives in the join: a workout id from someone else's plan finds nothing.
  def run(user_id, workout_id, conn=None):
    rows = query_array_json(
      """
      SELECT pw.id, pw.training_plan_id, pw.weekday, pw.name, pw.notes, pw.created_at, pw.updated_at
      FROM public.planned_workouts pw
      JOIN public.training_plans tp ON tp.id = pw.training_plan_id
      WHERE pw.id = %s AND tp.user_id = %s
      """,
      (workout_id, user_id), conn=conn
    )
    if not rows:
      return None
    workout = rows[0]
    workout['exercises'] = PlannedWorkoutExercises.run([workout['id']], conn=conn).get(str(workout['id']), [])
    return workout
