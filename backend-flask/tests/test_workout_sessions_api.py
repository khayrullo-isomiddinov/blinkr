import io
import json
import os
import uuid
from unittest import mock

# CognitoJwtToken.__init__ requires a truthy region (raises otherwise) --
# set a harmless default before importing app.py so module-level
# construction doesn't blow up when the env var isn't set for this test run.
os.environ.setdefault('AWS_DEFAULT_REGION', 'eu-central-1')


def _fake_urlopen(url, *args, **kwargs):
  # app.py constructs a CognitoJwtToken at import time, which fetches the
  # Cognito JWKS over the network in its constructor. Faking that response
  # keeps these HTTP-layer tests hermetic (no live AWS dependency) without
  # touching any actual Cognito configuration. Same approach as
  # test_exercises_api.py.
  return io.BytesIO(json.dumps({"keys": []}).encode())


with mock.patch('urllib.request.urlopen', _fake_urlopen):
  import app as app_module

import pytest

from lib.db import execute
from repositories.create_session_exercise import CreateSessionExercise
from repositories.create_set import CreateSet

flask_app = app_module.app


@pytest.fixture(autouse=True)
def fake_cognito_verify(monkeypatch):
  # resolve_current_user() only ever reads claims['username'] out of
  # whatever cognito_jwt_token.verify() returns -- real signature/JWKS
  # verification is already covered by test_auth.py's FakeCognitoJwtToken
  # unit tests, so here we bypass it and just echo the bearer token back as
  # the cognito_user_id, letting each test control who it's "logged in as".
  def _verify(token):
    return {'username': token}

  monkeypatch.setattr(app_module.cognito_jwt_token, 'verify', _verify)


@pytest.fixture
def client(db_available):
  flask_app.config['TESTING'] = True
  return flask_app.test_client()


@pytest.fixture
def make_auth_user(db_available):
  """
  A throwaway public.users row per call, with a unique cognito_user_id so it
  can be used as a distinct, unambiguous bearer token (the seeded demo users
  all share cognito_user_id='MOCK', which can't tell two users apart).
  """
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


def test_create_workout_session(client, make_auth_user):
  user = make_auth_user()
  response = client.post(
    '/api/workout-sessions',
    json={'started_at': '2026-01-01T10:00:00+00:00', 'notes': 'leg day'},
    headers=_auth_headers(user)
  )

  assert response.status_code == 201
  body = response.get_json()
  assert body['user_id'] == user['uuid']
  assert body['notes'] == 'leg day'
  assert body['completed_at'] is None

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (body['id'],))


def test_client_supplied_user_id_is_ignored(client, make_auth_user):
  user = make_auth_user()
  other = make_auth_user()

  response = client.post(
    '/api/workout-sessions',
    json={'started_at': '2026-01-01T10:00:00+00:00', 'user_id': other['uuid']},
    headers=_auth_headers(user)
  )

  assert response.status_code == 201
  body = response.get_json()
  assert body['user_id'] == user['uuid']
  assert body['user_id'] != other['uuid']

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (body['id'],))


def test_list_returns_only_authenticated_users_sessions(client, make_auth_user):
  user = make_auth_user()
  other = make_auth_user()

  mine = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T09:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()
  theirs = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T09:00:00+00:00'}, headers=_auth_headers(other)
  ).get_json()

  response = client.get('/api/workout-sessions', headers=_auth_headers(user))
  assert response.status_code == 200
  ids = {row['id'] for row in response.get_json()}
  assert mine['id'] in ids
  assert theirs['id'] not in ids

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (mine['id'],))
  execute("DELETE FROM public.workout_sessions WHERE id = %s", (theirs['id'],))


def test_list_orders_most_recent_started_at_first(client, make_auth_user):
  user = make_auth_user()

  older = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T08:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()
  newer = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-02T08:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()

  response = client.get('/api/workout-sessions', headers=_auth_headers(user))
  ids_in_order = [row['id'] for row in response.get_json()]
  assert ids_in_order.index(newer['id']) < ids_in_order.index(older['id'])

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (older['id'],))
  execute("DELETE FROM public.workout_sessions WHERE id = %s", (newer['id'],))


def test_get_own_session(client, make_auth_user):
  user = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()

  response = client.get(f"/api/workout-sessions/{created['id']}", headers=_auth_headers(user))
  assert response.status_code == 200
  assert response.get_json()['id'] == created['id']

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))


def test_get_another_users_session_returns_404(client, make_auth_user):
  owner = make_auth_user()
  intruder = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(owner)
  ).get_json()

  response = client.get(f"/api/workout-sessions/{created['id']}", headers=_auth_headers(intruder))
  assert response.status_code == 404
  assert response.get_json()['errors'] == ['workout_session_not_found']

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))


def test_get_nonexistent_session_returns_404(client, make_auth_user):
  user = make_auth_user()
  response = client.get(f"/api/workout-sessions/{uuid.uuid4()}", headers=_auth_headers(user))
  assert response.status_code == 404


def test_get_session_with_malformed_id_returns_404(client, make_auth_user):
  user = make_auth_user()
  response = client.get('/api/workout-sessions/not-a-uuid', headers=_auth_headers(user))
  assert response.status_code == 404


def test_get_session_includes_exercise_and_set_hierarchy(client, make_auth_user):
  user = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()

  exercise = execute(
    "INSERT INTO public.exercises (name, muscle_group) VALUES (%s, %s) RETURNING id",
    (f"API Test Exercise {uuid.uuid4().hex[:8]}", 'chest')
  )
  session_exercise = CreateSessionExercise.run(created['id'], exercise['id'], exercise_order=1)
  CreateSet.run(session_exercise['id'], set_order=1, reps=10, weight=50, weight_unit='kg')
  CreateSet.run(session_exercise['id'], set_order=2, reps=8, weight=55, weight_unit='kg')

  response = client.get(f"/api/workout-sessions/{created['id']}", headers=_auth_headers(user))
  assert response.status_code == 200
  body = response.get_json()
  assert len(body['session_exercises']) == 1
  assert body['session_exercises'][0]['exercise_id'] == exercise['id']
  assert len(body['session_exercises'][0]['sets']) == 2

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))
  execute("DELETE FROM public.exercises WHERE id = %s", (exercise['id'],))


def test_complete_own_session(client, make_auth_user):
  user = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(user)
  ).get_json()

  response = client.patch(f"/api/workout-sessions/{created['id']}/complete", headers=_auth_headers(user))
  assert response.status_code == 200
  body = response.get_json()
  assert body['id'] == created['id']
  assert body['completed_at'] is not None

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))


def test_cannot_complete_another_users_session(client, make_auth_user):
  owner = make_auth_user()
  intruder = make_auth_user()
  created = client.post(
    '/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth_headers(owner)
  ).get_json()

  response = client.patch(f"/api/workout-sessions/{created['id']}/complete", headers=_auth_headers(intruder))
  assert response.status_code == 404

  fetched = client.get(f"/api/workout-sessions/{created['id']}", headers=_auth_headers(owner)).get_json()
  assert fetched['completed_at'] is None

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (created['id'],))


def test_create_session_missing_started_at_is_rejected(client, make_auth_user):
  user = make_auth_user()
  response = client.post('/api/workout-sessions', json={'notes': 'no start time'}, headers=_auth_headers(user))
  assert response.status_code == 422
  assert 'started_at_blank' in response.get_json()


def test_create_session_rejects_malformed_json(client, make_auth_user):
  user = make_auth_user()
  headers = _auth_headers(user)
  headers['Content-Type'] = 'application/json'
  response = client.post('/api/workout-sessions', data='not valid json', headers=headers)
  assert response.status_code == 422


def test_create_session_rejects_non_string_started_at(client, make_auth_user):
  user = make_auth_user()
  response = client.post(
    '/api/workout-sessions', json={'started_at': 12345}, headers=_auth_headers(user)
  )
  assert response.status_code == 422
  assert 'started_at_invalid' in response.get_json()


def test_create_session_rejects_invalid_timestamp_format(client, make_auth_user):
  user = make_auth_user()
  response = client.post(
    '/api/workout-sessions', json={'started_at': 'not-a-real-date'}, headers=_auth_headers(user)
  )
  assert response.status_code == 422
  assert 'started_at_invalid' in response.get_json()


def test_workout_session_routes_require_authentication(client):
  response = client.get('/api/workout-sessions')
  assert response.status_code == 401
