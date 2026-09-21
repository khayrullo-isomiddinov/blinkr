from lib.db import execute, query_array_json


class FollowTeam:
  def run(user_uuid, team_uuid):
    teams = query_array_json("SELECT uuid FROM public.teams WHERE uuid = %s", (team_uuid,))
    if not teams:
      return None

    execute(
      """
      INSERT INTO public.user_followed_teams (user_uuid, team_uuid)
      VALUES (%s, %s)
      ON CONFLICT DO NOTHING
      """,
      (user_uuid, team_uuid)
    )
    return {'team_uuid': team_uuid, 'following': True}
