from lib.db import query_array_json
from services.follow_team import FollowTeam
from services.unfollow_team import UnfollowTeam
from services.follow_match import FollowMatch
from services.unfollow_match import UnfollowMatch


def test_follow_team_idempotent(make_teams, demo_user):
  home_uuid, _away_uuid = make_teams()

  FollowTeam.run(demo_user['uuid'], home_uuid)
  FollowTeam.run(demo_user['uuid'], home_uuid)  # double-follow shouldn't error

  rows = query_array_json(
    "SELECT * FROM public.user_followed_teams WHERE user_uuid = %s AND team_uuid = %s",
    (demo_user['uuid'], home_uuid)
  )
  assert len(rows) == 1


def test_unfollow_team_when_not_following_does_not_error(make_teams, demo_user):
  home_uuid, _away_uuid = make_teams()
  result = UnfollowTeam.run(demo_user['uuid'], home_uuid)
  assert result == {'team_uuid': home_uuid, 'following': False}


def test_follow_match_idempotent(make_match, demo_user):
  match = make_match(status='scheduled', kickoff_offset_minutes=60)

  FollowMatch.run(demo_user['uuid'], match['uuid'])
  FollowMatch.run(demo_user['uuid'], match['uuid'])

  rows = query_array_json(
    "SELECT * FROM public.user_followed_matches WHERE user_uuid = %s AND match_uuid = %s",
    (demo_user['uuid'], match['uuid'])
  )
  assert len(rows) == 1


def test_unfollow_match_when_not_following_does_not_error(make_match, demo_user):
  match = make_match(status='scheduled', kickoff_offset_minutes=60)
  result = UnfollowMatch.run(demo_user['uuid'], match['uuid'])
  assert result == {'match_uuid': match['uuid'], 'following': False}


def test_follow_unknown_team_returns_none(demo_user):
  result = FollowTeam.run(demo_user['uuid'], '00000000-0000-0000-0000-000000000000')
  assert result is None


def test_follow_unknown_match_returns_none(demo_user):
  result = FollowMatch.run(demo_user['uuid'], '00000000-0000-0000-0000-000000000000')
  assert result is None


def test_unfollow_unknown_team_returns_none(demo_user):
  result = UnfollowTeam.run(demo_user['uuid'], '00000000-0000-0000-0000-000000000000')
  assert result is None


def test_unfollow_unknown_match_returns_none(demo_user):
  result = UnfollowMatch.run(demo_user['uuid'], '00000000-0000-0000-0000-000000000000')
  assert result is None
