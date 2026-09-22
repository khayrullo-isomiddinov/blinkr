from lib.db import query_array_json


class Exercises:
  def run():
    sql = """
      SELECT id, name, muscle_group, equipment, image_url, image_attribution, created_at
      FROM public.exercises
      ORDER BY name
    """
    return query_array_json(sql)
