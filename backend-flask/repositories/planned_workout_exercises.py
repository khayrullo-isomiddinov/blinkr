from lib.db import query_array_json


class PlannedWorkoutExercises:
  # {planned_workout_id: [exercise, ...]} in workout order, with the library name/muscle group joined in.
  def run(workout_ids, conn=None):
    if not workout_ids:
      return {}
    rows = query_array_json(
      """
      SELECT
        pe.id, pe.planned_workout_id, pe.exercise_id, pe.exercise_order,
        pe.target_sets, pe.target_reps_min, pe.target_reps_max, pe.target_weight, pe.target_weight_unit, pe.notes,
        e.name AS exercise_name, e.muscle_group AS exercise_muscle_group
      FROM public.planned_exercises pe
      JOIN public.exercises e ON e.id = pe.exercise_id
      WHERE pe.planned_workout_id = ANY(%s::uuid[])
      ORDER BY pe.planned_workout_id, pe.exercise_order
      """,
      (list(workout_ids),), conn=conn
    )
    grouped = {}
    for row in rows:
      grouped.setdefault(str(row['planned_workout_id']), []).append(row)
    return grouped
