from lib.db import execute


class CreateSet:
  def run(session_exercise_id, set_order, reps, weight=None, weight_unit=None, set_type='working'):
    return execute(
      """
      INSERT INTO public.sets (session_exercise_id, set_order, reps, weight, weight_unit, set_type)
      VALUES (%s, %s, %s, %s, %s, %s)
      RETURNING id, session_exercise_id, set_order, reps, weight, weight_unit, set_type, created_at
      """,
      (session_exercise_id, set_order, reps, weight, weight_unit, set_type)
    )
