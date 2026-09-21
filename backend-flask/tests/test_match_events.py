from datetime import timedelta

from lib.db import query_array_json
from services.create_match_event import CreateMatchEvent
from services.create_match_reaction import CreateMatchReaction


def test_invalid_event_type_rejected(make_match):
  match = make_match(status='live')
  model = CreateMatchEvent.run(match['uuid'], event_type='OFFSIDE', minute=10)
  assert model['errors'] == ['event_type_invalid']


def test_goal_increments_home_score(make_match):
  match = make_match(status='live', home_score=0, away_score=0)
  model = CreateMatchEvent.run(match['uuid'], event_type='GOAL', minute=10, team_uuid=match['home_team_uuid'])
  assert model['errors'] is None

  rows = query_array_json("SELECT home_score, away_score FROM public.matches WHERE uuid = %s", (match['uuid'],))
  assert rows[0]['home_score'] == 1
  assert rows[0]['away_score'] == 0


def test_goal_increments_away_score(make_match):
  match = make_match(status='live', home_score=0, away_score=0)
  CreateMatchEvent.run(match['uuid'], event_type='GOAL', minute=10, team_uuid=match['away_team_uuid'])

  rows = query_array_json("SELECT home_score, away_score FROM public.matches WHERE uuid = %s", (match['uuid'],))
  assert rows[0]['home_score'] == 0
  assert rows[0]['away_score'] == 1


def test_half_time_updates_status(make_match):
  match = make_match(status='live')
  CreateMatchEvent.run(match['uuid'], event_type='HALF_TIME', minute=45)

  rows = query_array_json("SELECT status FROM public.matches WHERE uuid = %s", (match['uuid'],))
  assert rows[0]['status'] == 'half_time'


def test_full_time_updates_status_and_tightens_reaction_expiry(make_match, demo_user):
  match = make_match(status='live')
  reaction = CreateMatchReaction.run(match['uuid'], demo_user['uuid'], 'still going')['data']

  CreateMatchEvent.run(match['uuid'], event_type='FULL_TIME', minute=90)

  rows = query_array_json("SELECT status FROM public.matches WHERE uuid = %s", (match['uuid'],))
  assert rows[0]['status'] == 'finished'

  reaction_rows = query_array_json(
    "SELECT expires_at, current_timestamp AS now FROM public.match_reactions WHERE uuid = %s",
    (reaction['uuid'],)
  )
  assert reaction_rows[0]['expires_at'] - reaction_rows[0]['now'] <= timedelta(minutes=31)
