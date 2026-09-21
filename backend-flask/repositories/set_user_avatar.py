import psycopg2

from lib.db import execute


class SetUserAvatar:
  def run(user_id, image_bytes, content_type):
    return execute(
      """
      UPDATE public.users
      SET avatar = %s, avatar_content_type = %s, avatar_updated_at = current_timestamp
      WHERE uuid = %s
      RETURNING uuid
      """,
      (psycopg2.Binary(image_bytes), content_type, user_id)
    )
