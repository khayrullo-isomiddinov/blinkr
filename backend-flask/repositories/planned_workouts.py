from lib.db import query_array_json
from repositories.planned_workout_exercises import PlannedWorkoutExercises


class PlannedWorkouts:
  def run(plan_id, conn=None):
    workouts = query_array_json(
      """
      SELECT id, training_plan_id, weekday, name, notes, created_at, updated_at
      FROM public.planned_workouts
      WHERE training_plan_id = %s
      ORDER BY weekday
      """,
      (plan_id,), conn=conn
    )
    exercises = PlannedWorkoutExercises.run([w['id'] for w in workouts], conn=conn)
    for workout in workouts:
      workout['exercises'] = exercises.get(str(workout['id']), [])
    return workouts
