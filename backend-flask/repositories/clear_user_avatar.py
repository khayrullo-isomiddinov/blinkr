from lib.db import execute


class ClearUserAvatar:
  def run(user_id):
    return execute(
      """
      UPDATE public.users
      SET avatar = NULL, avatar_content_type = NULL, avatar_updated_at = NULL
      WHERE uuid = %s
      RETURNING uuid
      """,
      (user_id,)
    )
