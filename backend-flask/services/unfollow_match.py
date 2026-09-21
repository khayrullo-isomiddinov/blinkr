from lib.db import execute, query_array_json


class UnfollowMatch:
  def run(user_uuid, match_uuid):
    matches = query_array_json("SELECT uuid FROM public.matches WHERE uuid = %s", (match_uuid,))
    if not matches:
      return None

    execute(
      """
      DELETE FROM public.user_followed_matches
      WHERE user_uuid = %s AND match_uuid = %s
      """,
      (user_uuid, match_uuid)
    )
    return {'match_uuid': match_uuid, 'following': False}
