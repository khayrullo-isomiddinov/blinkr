from lib.db import query_array_json


class MatchEvents:
  def run(match_uuid):
    sql = """
      SELECT
        match_events.uuid,
        match_events.event_type,
        match_events.minute,
        match_events.player_name,
        match_events.detail,
        match_events.created_at,
        teams.uuid AS team_uuid,
        teams.abbreviation AS team_abbreviation
      FROM public.match_events
      LEFT JOIN public.teams ON teams.uuid = match_events.team_uuid
      WHERE match_events.match_uuid = %s
      ORDER BY match_events.minute ASC, match_events.created_at ASC
    """
    return query_array_json(sql, (match_uuid,))
