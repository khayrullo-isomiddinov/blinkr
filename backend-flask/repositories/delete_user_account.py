from lib.db import execute, transaction


class DeleteUserAccount:
  # Workouts first: workout_sessions.user_id has no cascade, and deleting a session removes its exercises and sets.
  def run(user_id):
    with transaction() as conn:
      execute("DELETE FROM public.workout_sessions WHERE user_id = %s", (user_id,), conn=conn)
      execute("DELETE FROM public.users WHERE uuid = %s", (user_id,), conn=conn)
