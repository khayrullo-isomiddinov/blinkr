from lib.db import query_array_json


class RenameTrainingPlan:
  def run(user_id, name):
    rows = query_array_json(
      """
      UPDATE public.training_plans SET name = %s, updated_at = current_timestamp
      WHERE user_id = %s
      RETURNING id, name, created_at, updated_at
      """,
      (name, user_id)
    )
    return rows[0] if rows else None
