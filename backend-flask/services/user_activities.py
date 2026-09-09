from lib.db import query_array_json


class UserActivities:
  def run(user_handle):
    if user_handle is None or len(user_handle) < 1:
      return {'errors': ['blank_user_handle'], 'data': None}

    sql = """
      SELECT
        activities.uuid,
        users.display_name,
        users.handle,
        activities.message,
        activities.replies_count,
        activities.reposts_count,
        activities.likes_count,
        activities.reply_to_activity_uuid,
        activities.expires_at,
        activities.created_at
      FROM public.activities
      LEFT JOIN public.users ON users.uuid = activities.user_uuid
      WHERE users.handle = %s
      ORDER BY activities.created_at DESC
    """
    results = query_array_json(sql, (user_handle,))
    return {'errors': None, 'data': results}
