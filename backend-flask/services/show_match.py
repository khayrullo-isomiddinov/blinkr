from lib.db import query_array_json
from lib.match_time import compute_elapsed_minute


class ShowMatch:
  def run(match_uuid):
    rows = query_array_json(
      """
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
      WHERE matches.uuid = %s
      """,
      (match_uuid,)
    )
    if not rows:
      return None

    match = rows[0]
    match['elapsed_minute'] = compute_elapsed_minute(match['kickoff_time'], match['status'])
    return match
