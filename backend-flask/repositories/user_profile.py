from lib.db import query_array_json


class UserProfile:
  def run(user_id):
    rows = query_array_json(
      """
      SELECT uuid, handle, display_name, avatar, avatar_content_type, avatar_updated_at
      FROM public.users
      WHERE uuid = %s
      """,
      (user_id,)
    )
    return rows[0] if rows else None
