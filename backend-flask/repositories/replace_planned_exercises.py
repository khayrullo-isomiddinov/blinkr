from lib.db import execute


class ReplacePlannedExercises:
  # Call inside a transaction: the old list is removed and the new one inserted in list order (1, 2, 3 ...).
  def run(workout_id, exercises, conn):
    execute("DELETE FROM public.planned_exercises WHERE planned_workout_id = %s", (workout_id,), conn=conn)
    for order, exercise in enumerate(exercises, start=1):
      execute(
        """
        INSERT INTO public.planned_exercises (
          planned_workout_id, exercise_id, exercise_order,
          target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit, notes
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
          workout_id, exercise['exercise_id'], order,
          exercise['target_sets'], exercise['target_reps_min'], exercise['target_reps_max'],
          exercise['target_weight'], exercise['target_weight_unit'], exercise['notes'],
        ),
        conn=conn
      )
