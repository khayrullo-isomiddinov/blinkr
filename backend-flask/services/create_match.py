from datetime import datetime, timezone

from lib.db import execute, query_array_json

VALID_STATUSES = ('scheduled', 'live', 'half_time', 'finished')


class CreateMatch:
  # Admin/demo tool -- lets a new fixture be created (and optionally started
  # as 'live' immediately) without hand-writing SQL, so the event-driven
  # demo flow (start match -> add events -> finish match) is self-contained.
  def run(home_team_uuid, away_team_uuid, competition=None, kickoff_time=None, status='scheduled'):
    model = {'errors': None, 'data': None}

    if not home_team_uuid or not away_team_uuid:
      model['errors'] = ['team_uuid_blank']
      return model
    if home_team_uuid == away_team_uuid:
      model['errors'] = ['teams_must_differ']
      return model
    if status not in VALID_STATUSES:
      model['errors'] = ['status_invalid']
      return model

    teams = query_array_json(
      "SELECT uuid FROM public.teams WHERE uuid IN (%s, %s)",
      (home_team_uuid, away_team_uuid)
    )
    if len(teams) != 2:
      model['errors'] = ['team_not_found']
      return model

    if kickoff_time is None:
      kickoff_time = datetime.now(timezone.utc)
    elif isinstance(kickoff_time, str):
      try:
        kickoff_time = datetime.fromisoformat(kickoff_time.replace('Z', '+00:00'))
      except ValueError:
        model['errors'] = ['kickoff_time_invalid']
        return model

    row = execute(
      """
      INSERT INTO public.matches (home_team_uuid, away_team_uuid, competition, kickoff_time, status)
      VALUES (%s, %s, %s, %s, %s)
      RETURNING uuid, competition, kickoff_time, status, home_score, away_score
      """,
      (home_team_uuid, away_team_uuid, competition or 'Friendly', kickoff_time, status)
    )
    model['data'] = row
    return model
