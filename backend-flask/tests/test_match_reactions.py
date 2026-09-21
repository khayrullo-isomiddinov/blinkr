from datetime import datetime, timedelta, timezone

from lib.db import execute
from services.create_match_reaction import CreateMatchReaction
from services.match_reactions import MatchReactions


def test_blank_message_rejected(make_match, demo_user):
  match = make_match(status='live')
  model = CreateMatchReaction.run(match['uuid'], demo_user['uuid'], '')
  assert model['errors'] == ['message_blank']


def test_over_length_message_rejected(make_match, demo_user):
  match = make_match(status='live')
  model = CreateMatchReaction.run(match['uuid'], demo_user['uuid'], 'x' * 281)
  assert model['errors'] == ['message_exceed_max_chars']


def test_valid_reaction_on_live_match_gets_long_expiry(make_match, demo_user):
  match = make_match(status='live')
  model = CreateMatchReaction.run(match['uuid'], demo_user['uuid'], 'What a goal!')
  assert model['errors'] is None
  expires_at = datetime.fromisoformat(model['data']['expires_at'])
  now = datetime.now(timezone.utc)
  assert expires_at - now > timedelta(hours=2)


def test_valid_reaction_on_finished_match_gets_short_expiry(make_match, demo_user):
  match = make_match(status='finished')
  model = CreateMatchReaction.run(match['uuid'], demo_user['uuid'], 'gg')
  assert model['errors'] is None
  expires_at = datetime.fromisoformat(model['data']['expires_at'])
  now = datetime.now(timezone.utc)
  assert expires_at - now <= timedelta(minutes=31)


def test_expired_reaction_excluded_from_active_list(make_match, demo_user):
  match = make_match(status='live')
  model = CreateMatchReaction.run(match['uuid'], demo_user['uuid'], 'still here?')
  reaction_uuid = model['data']['uuid']

  execute(
    "UPDATE public.match_reactions SET expires_at = current_timestamp - interval '1 minute' WHERE uuid = %s",
    (reaction_uuid,)
  )

  active = MatchReactions.run(match['uuid'])
  assert all(r['uuid'] != reaction_uuid for r in active)


def test_reaction_against_unknown_match_rejected(demo_user):
  model = CreateMatchReaction.run('00000000-0000-0000-0000-000000000000', demo_user['uuid'], 'hello')
  assert model['errors'] == ['match_not_found']
