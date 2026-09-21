from lib.db import query_array_json


class MatchReactions:
  def run(match_uuid):
    sql = """
      SELECT
        match_reactions.uuid,
        users.display_name,
        users.handle,
        match_reactions.message,
        match_reactions.created_at
      FROM public.match_reactions
      JOIN public.users ON users.uuid = match_reactions.user_uuid
      WHERE match_reactions.match_uuid = %s
        AND match_reactions.expires_at > current_timestamp
      ORDER BY match_reactions.created_at ASC
    """
    return query_array_json(sql, (match_uuid,))
