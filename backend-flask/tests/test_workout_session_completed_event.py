import uuid

import pytest

from lib.db import query_array_json
from events.workout_session_completed import WorkoutSessionCompleted, EVENT_TYPE
from application.complete_workout_session import CompleteWorkoutSessionAndRecordEvent

# --- pure application-layer tests: no Flask, no HTTP, no Cognito ---------
# These hit a real Postgres (via the existing conftest fixtures) rather than
# mocking the database, since what's under test here is transaction
# behavior itself.


def _outbox_rows_for(session_id):
  return query_array_json(
    "SELECT * FROM public.outbox_events WHERE payload->>'workout_session_id' = %s ORDER BY created_at",
    (session_id,)
  )


def test_completing_valid_session_creates_completed_workout_and_outbox_event(demo_user, make_workout_session):
  session_id = make_workout_session(demo_user['uuid'])

  result = CompleteWorkoutSessionAndRecordEvent.run(session_id, demo_user['uuid'])

  assert result is not None
  assert result['completed_at'] is not None

  outbox_rows = _outbox_rows_for(session_id)
  assert len(outbox_rows) == 1
  assert outbox_rows[0]['event_type'] == EVENT_TYPE
  assert outbox_rows[0]['published_at'] is None
  assert outbox_rows[0]['attempts'] == 0


def test_outbox_event_payload_matches_the_wire_format(demo_user, make_workout_session):
  session_id = make_workout_session(demo_user['uuid'])
  CompleteWorkoutSessionAndRecordEvent.run(session_id, demo_user['uuid'])

  row = _outbox_rows_for(session_id)[0]
  payload = row['payload']
  assert set(payload.keys()) == {'event_id', 'event_type', 'occurred_at', 'user_id', 'workout_session_id'}
  assert payload['user_id'] == demo_user['uuid']
  assert payload['workout_session_id'] == session_id
  assert payload['event_type'] == EVENT_TYPE
  assert row['event_id'] == payload['event_id']


def test_event_has_unique_event_id_across_sessions(demo_user, make_workout_session):
  session_a = make_workout_session(demo_user['uuid'])
  session_b = make_workout_session(demo_user['uuid'])

  CompleteWorkoutSessionAndRecordEvent.run(session_a, demo_user['uuid'])
  CompleteWorkoutSessionAndRecordEvent.run(session_b, demo_user['uuid'])

  event_ids = {row['event_id'] for row in _outbox_rows_for(session_a) + _outbox_rows_for(session_b)}
  assert len(event_ids) == 2


def test_event_is_immutable():
  event = WorkoutSessionCompleted(user_id=str(uuid.uuid4()), workout_session_id=str(uuid.uuid4()))
  with pytest.raises(AttributeError):
    event.user_id = 'someone-else'


def test_nonexistent_session_creates_no_outbox_event(demo_user):
  before = query_array_json("SELECT count(*) AS n FROM public.outbox_events")[0]['n']

  result = CompleteWorkoutSessionAndRecordEvent.run(str(uuid.uuid4()), demo_user['uuid'])

  after = query_array_json("SELECT count(*) AS n FROM public.outbox_events")[0]['n']
  assert result is None
  assert after == before


def test_another_users_session_creates_no_outbox_event(demo_user, other_user, make_workout_session):
  session_id = make_workout_session(demo_user['uuid'])
  before = query_array_json("SELECT count(*) AS n FROM public.outbox_events")[0]['n']

  result = CompleteWorkoutSessionAndRecordEvent.run(session_id, other_user['uuid'])

  after = query_array_json("SELECT count(*) AS n FROM public.outbox_events")[0]['n']
  assert result is None
  assert after == before


def test_workout_update_failure_creates_no_outbox_event(monkeypatch, demo_user, make_workout_session):
  session_id = make_workout_session(demo_user['uuid'])

  def _boom(*args, **kwargs):
    raise RuntimeError('simulated workout update failure')

  monkeypatch.setattr('repositories.complete_workout_session.execute', _boom)

  with pytest.raises(RuntimeError):
    CompleteWorkoutSessionAndRecordEvent.run(session_id, demo_user['uuid'])

  assert _outbox_rows_for(session_id) == []


def test_outbox_insertion_failure_rolls_back_workout_completion(monkeypatch, demo_user, make_workout_session):
  # the single most important behavior in this task: the UPDATE and the
  # outbox INSERT are one transaction, so a failure in either undoes both.
  session_id = make_workout_session(demo_user['uuid'])

  def _boom(*args, **kwargs):
    raise RuntimeError('simulated outbox insert failure')

  monkeypatch.setattr('repositories.create_outbox_event.execute', _boom)

  with pytest.raises(RuntimeError):
    CompleteWorkoutSessionAndRecordEvent.run(session_id, demo_user['uuid'])

  rows = query_array_json("SELECT completed_at FROM public.workout_sessions WHERE id = %s", (session_id,))
  assert rows[0]['completed_at'] is None
  assert _outbox_rows_for(session_id) == []


def test_repeated_completion_creates_no_additional_outbox_event(demo_user, make_workout_session):
  session_id = make_workout_session(demo_user['uuid'])

  first = CompleteWorkoutSessionAndRecordEvent.run(session_id, demo_user['uuid'])
  second = CompleteWorkoutSessionAndRecordEvent.run(session_id, demo_user['uuid'])

  assert first is not None
  assert second is not None
  assert len(_outbox_rows_for(session_id)) == 1


# --- HTTP-level integration: confirms the route is actually wired up ------

import io
import json
import os
from unittest import mock

os.environ.setdefault('AWS_DEFAULT_REGION', 'eu-central-1')


def _fake_urlopen(url, *args, **kwargs):
  return io.BytesIO(json.dumps({"keys": []}).encode())


with mock.patch('urllib.request.urlopen', _fake_urlopen):
  import app as app_module

from events.in_memory_publisher import InMemoryEventPublisher
from lib.db import execute

flask_app = app_module.app


@pytest.fixture(autouse=True)
def fake_cognito_verify(monkeypatch):
  def _verify(token):
    return {'username': token}

  monkeypatch.setattr(app_module.cognito_jwt_token, 'verify', _verify)


@pytest.fixture
def client(db_available):
  flask_app.config['TESTING'] = True
  return flask_app.test_client()


@pytest.fixture
def make_auth_user(db_available):
  created_uuids = []

  def _make():
    suffix = uuid.uuid4().hex[:12]
    row = execute(
      "INSERT INTO public.users (display_name, handle, cognito_user_id) "
      "VALUES (%s, %s, %s) RETURNING uuid, cognito_user_id",
      (f"API Test User {suffix}", f"api-test-{suffix}", f"cognito-{suffix}")
    )
    created_uuids.append(row['uuid'])
    return row

  yield _make

  for user_uuid in created_uuids:
    execute("DELETE FROM public.users WHERE uuid = %s", (user_uuid,))


def _auth_headers(user_row):
  return {'Authorization': f"Bearer {user_row['cognito_user_id']}"}


def test_completing_session_via_http_creates_outbox_event(client, make_auth_user):
  user = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()

  response = client.patch(f"/api/workout-sessions/{created['id']}/complete", headers=_auth_headers(user))
  assert response.status_code == 200

  rows = _outbox_rows_for(created['id'])
  assert len(rows) == 1
  assert rows[0]['published_at'] is None

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))


def test_completing_another_users_session_via_http_creates_no_outbox_event(client, make_auth_user):
  owner = make_auth_user()
  intruder = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(owner)
  ).get_json()

  response = client.patch(f"/api/workout-sessions/{created['id']}/complete", headers=_auth_headers(intruder))
  assert response.status_code == 404
  assert _outbox_rows_for(created['id']) == []

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))


def test_repeated_completion_via_http_creates_no_additional_outbox_event(client, make_auth_user):
  user = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()

  first = client.patch(f"/api/workout-sessions/{created['id']}/complete", headers=_auth_headers(user))
  second = client.patch(f"/api/workout-sessions/{created['id']}/complete", headers=_auth_headers(user))
  assert first.status_code == 200
  assert second.status_code == 200

  assert len(_outbox_rows_for(created['id'])) == 1

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))


def test_completion_succeeds_even_when_configured_publisher_would_fail(client, make_auth_user, monkeypatch):
  # Proves SQS is genuinely decoupled from this request: if the route ever
  # called the publisher synchronously, this would surface as a 500, not a
  # clean 200 -- publishing is now entirely OutboxPublisher's job, run out
  # of band, never during this request.
  user = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()

  def _always_fails(event):
    raise RuntimeError('SQS is unavailable')

  monkeypatch.setattr(InMemoryEventPublisher, 'publish', _always_fails)

  response = client.patch(f"/api/workout-sessions/{created['id']}/complete", headers=_auth_headers(user))
  assert response.status_code == 200
  assert response.get_json()['completed_at'] is not None
  assert len(_outbox_rows_for(created['id'])) == 1

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))
