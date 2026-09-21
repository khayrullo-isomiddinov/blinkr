from lib.db import execute, query_array_json


class FollowMatch:
  def run(user_uuid, match_uuid):
    matches = query_array_json("SELECT uuid FROM public.matches WHERE uuid = %s", (match_uuid,))
    if not matches:
      return None

    execute(
      """
      INSERT INTO public.user_followed_matches (user_uuid, match_uuid)
      VALUES (%s, %s)
      ON CONFLICT DO NOTHING
      """,
      (user_uuid, match_uuid)
    )
    return {'match_uuid': match_uuid, 'following': True}
