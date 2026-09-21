from lib.db import execute


class UpdateUserDisplayName:
  def run(user_id, display_name):
    return execute(
      "UPDATE public.users SET display_name = %s WHERE uuid = %s RETURNING uuid",
      (display_name, user_id)
    )
