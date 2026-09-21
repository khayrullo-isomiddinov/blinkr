from lib.db import query_array_json


class DeleteTrainingPlan:
  # Planned workouts and planned exercises go with it (ON DELETE CASCADE); workout history is untouched.
  def run(user_id):
    rows = query_array_json("DELETE FROM public.training_plans WHERE user_id = %s RETURNING id", (user_id,))
    return rows[0] if rows else None
