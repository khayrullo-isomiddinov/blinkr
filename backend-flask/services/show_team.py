from lib.db import query_array_json


class ShowTeam:
  def run(team_uuid):
    teams = query_array_json(
      """
      SELECT uuid, name, short_name, abbreviation, country
      FROM public.teams
      WHERE uuid = %s
      """,
      (team_uuid,)
    )
    if not teams:
      return None

    team = teams[0]

    matches = query_array_json(
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
      WHERE matches.home_team_uuid = %s OR matches.away_team_uuid = %s
      ORDER BY matches.kickoff_time DESC
      """,
      (team_uuid, team_uuid)
    )

    team['matches'] = matches
    return team
