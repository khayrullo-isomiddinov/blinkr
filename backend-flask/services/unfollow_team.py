from lib.db import execute, query_array_json


class UnfollowTeam:
  def run(user_uuid, team_uuid):
    teams = query_array_json("SELECT uuid FROM public.teams WHERE uuid = %s", (team_uuid,))
    if not teams:
      return None

    execute(
      """
      DELETE FROM public.user_followed_teams
      WHERE user_uuid = %s AND team_uuid = %s
      """,
      (user_uuid, team_uuid)
    )
    return {'team_uuid': team_uuid, 'following': False}
