from lib.db import query_array_json


class TrainingPlan:
  def run(user_id, conn=None):
    rows = query_array_json(
      "SELECT id, name, created_at, updated_at FROM public.training_plans WHERE user_id = %s",
      (user_id,), conn=conn
    )
    return rows[0] if rows else None
