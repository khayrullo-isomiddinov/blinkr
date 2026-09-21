from lib.db import execute


class CreateExercise:
  def run(name, muscle_group, equipment=None):
    return execute(
      """
      INSERT INTO public.exercises (name, muscle_group, equipment)
      VALUES (%s, %s, %s)
      RETURNING id, name, muscle_group, equipment, created_at
      """,
      (name, muscle_group, equipment)
    )
