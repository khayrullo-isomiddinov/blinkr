from lib.db import query_array_json
from lib.match_time import compute_elapsed_minute


class Matches:
  def run(status_filter=None, followed_by_user_uuid=None):
    sql = """
      SELECT
        matches.uuid,
        matches.competition,
        matches.kickoff_time,
        matches.status,
        matches.home_score,
        matches.away_score,
        home_teams.uuid AS home_team_uuid,
        home_teams.name AS home_team_name,
        home_teams.abbreviation AS home_team_abbreviation,
        away_teams.uuid AS away_team_uuid,
        away_teams.name AS away_team_name,
        away_teams.abbreviation AS away_team_abbreviation
      FROM public.matches
      JOIN public.teams AS home_teams ON home_teams.uuid = matches.home_team_uuid
      JOIN public.teams AS away_teams ON away_teams.uuid = matches.away_team_uuid
    """
    conditions = []
    params = []

    if status_filter:
      conditions.append("matches.status = %s")
      params.append(status_filter)

    if followed_by_user_uuid:
      sql += " JOIN public.user_followed_matches ON user_followed_matches.match_uuid = matches.uuid"
      conditions.append("user_followed_matches.user_uuid = %s")
      params.append(followed_by_user_uuid)

    if conditions:
      sql += " WHERE " + " AND ".join(conditions)

    sql += " ORDER BY matches.kickoff_time ASC"

    results = query_array_json(sql, tuple(params))
    for match in results:
      match['elapsed_minute'] = compute_elapsed_minute(match['kickoff_time'], match['status'])
    return results
