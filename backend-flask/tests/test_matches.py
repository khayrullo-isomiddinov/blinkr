from lib.db import execute
from services.matches import Matches
from services.create_match import CreateMatch
from services.show_match import ShowMatch


def test_create_match(make_teams):
  home_uuid, away_uuid = make_teams()
  model = CreateMatch.run(home_uuid, away_uuid, competition='Test Cup', status='scheduled')
  assert model['errors'] is None
  assert model['data']['status'] == 'scheduled'

  fetched = ShowMatch.run(model['data']['uuid'])
  assert fetched['home_team_uuid'] == home_uuid
  assert fetched['away_team_uuid'] == away_uuid

  execute("DELETE FROM public.matches WHERE uuid = %s", (model['data']['uuid'],))


def test_create_match_rejects_same_team_twice(make_teams):
  home_uuid, _away_uuid = make_teams()
  model = CreateMatch.run(home_uuid, home_uuid)
  assert model['errors'] == ['teams_must_differ']


def test_create_match_rejects_unknown_team(make_teams):
  home_uuid, _away_uuid = make_teams()
  model = CreateMatch.run(home_uuid, '00000000-0000-0000-0000-000000000000')
  assert model['errors'] == ['team_not_found']


def test_create_match_rejects_invalid_kickoff_time(make_teams):
  home_uuid, away_uuid = make_teams()
  model = CreateMatch.run(home_uuid, away_uuid, kickoff_time='not-a-date')
  assert model['errors'] == ['kickoff_time_invalid']


def test_status_filter_returns_only_matching_rows(make_match):
  live_match = make_match(status='live')
  scheduled_match = make_match(status='scheduled', kickoff_offset_minutes=120)

  live_results = Matches.run(status_filter='live')
  live_uuids = {m['uuid'] for m in live_results}
  assert live_match['uuid'] in live_uuids
  assert scheduled_match['uuid'] not in live_uuids

  scheduled_results = Matches.run(status_filter='scheduled')
  scheduled_uuids = {m['uuid'] for m in scheduled_results}
  assert scheduled_match['uuid'] in scheduled_uuids
  assert live_match['uuid'] not in scheduled_uuids


def test_elapsed_minute_present_only_for_live_matches(make_match):
  live_match = make_match(status='live', kickoff_offset_minutes=-40)
  scheduled_match = make_match(status='scheduled', kickoff_offset_minutes=120)
  finished_match = make_match(status='finished', kickoff_offset_minutes=-200)

  results = {m['uuid']: m for m in Matches.run()}

  assert results[live_match['uuid']]['elapsed_minute'] is not None
  assert results[live_match['uuid']]['elapsed_minute'] >= 39
  assert results[scheduled_match['uuid']]['elapsed_minute'] is None
  assert results[finished_match['uuid']]['elapsed_minute'] is None


def test_followed_by_user_uuid_filters_correctly(make_match, demo_user, other_user):
  followed_match = make_match(status='live')
  other_match = make_match(status='live')

  execute(
    "INSERT INTO public.user_followed_matches (user_uuid, match_uuid) VALUES (%s, %s)",
    (demo_user['uuid'], followed_match['uuid'])
  )

  results = Matches.run(followed_by_user_uuid=demo_user['uuid'])
  result_uuids = {m['uuid'] for m in results}
  assert followed_match['uuid'] in result_uuids
  assert other_match['uuid'] not in result_uuids

  other_results = Matches.run(followed_by_user_uuid=other_user['uuid'])
  assert followed_match['uuid'] not in {m['uuid'] for m in other_results}
