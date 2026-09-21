from lib.db import query_array_json


class Teams:
  def run(followed_by_user_uuid=None):
    if followed_by_user_uuid:
      sql = """
        SELECT
          teams.uuid,
          teams.name,
          teams.short_name,
          teams.abbreviation,
          teams.country
        FROM public.teams
        JOIN public.user_followed_teams ON user_followed_teams.team_uuid = teams.uuid
        WHERE user_followed_teams.user_uuid = %s
        ORDER BY teams.name
      """
      return query_array_json(sql, (followed_by_user_uuid,))

    sql = """
      SELECT
        teams.uuid,
        teams.name,
        teams.short_name,
        teams.abbreviation,
        teams.country
      FROM public.teams
      ORDER BY teams.name
    """
    return query_array_json(sql)
