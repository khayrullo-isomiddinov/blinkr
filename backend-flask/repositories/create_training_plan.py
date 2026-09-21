from lib.db import query_array_json


class CreateTrainingPlan:
  # None when the user already has a plan (one plan per user).
  def run(user_id, name, conn=None):
    rows = query_array_json(
      """
      INSERT INTO public.training_plans (user_id, name) VALUES (%s, %s)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id, name, created_at, updated_at
      """,
      (user_id, name), conn=conn
    )
    return rows[0] if rows else None
