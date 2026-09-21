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
  # test_exercises_api.py / test_workout_sessions_api.py.
  return io.BytesIO(json.dumps({"keys": []}).encode())


with mock.patch('urllib.request.urlopen', _fake_urlopen):
  import app as app_module

import pytest

from lib.db import execute

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


def _create_session(client, user):
  return client.post(
    '/api/workout-sessions',
    json={'started_at': '2026-01-01T10:00:00+00:00'},
    headers=_auth_headers(user)
  ).get_json()


def test_add_exercise_to_own_session(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()

  response = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_id, 'exercise_order': 1, 'notes': 'first exercise'},
    headers=_auth_headers(user)
  )

  assert response.status_code == 201
  body = response.get_json()
  assert body['session_id'] == session['id']
  assert body['exercise_id'] == exercise_id
  assert body['exercise_order'] == 1
  assert body['notes'] == 'first exercise'

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_list_exercises_from_own_session(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_id, 'exercise_order': 1},
    headers=_auth_headers(user)
  )

  response = client.get(f"/api/workout-sessions/{session['id']}/exercises", headers=_auth_headers(user))
  assert response.status_code == 200
  rows = response.get_json()
  assert len(rows) == 1
  assert rows[0]['exercise_id'] == exercise_id

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_exercises_returned_in_order(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_a = make_exercise()
  exercise_b = make_exercise()

  client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_b, 'exercise_order': 2}, headers=_auth_headers(user)
  )
  client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_a, 'exercise_order': 1}, headers=_auth_headers(user)
  )

  response = client.get(f"/api/workout-sessions/{session['id']}/exercises", headers=_auth_headers(user))
  rows = response.get_json()
  assert [row['exercise_id'] for row in rows] == [exercise_a, exercise_b]

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_cannot_add_exercise_to_another_users_session(client, make_auth_user, make_exercise):
  owner = make_auth_user()
  intruder = make_auth_user()
  session = _create_session(client, owner)
  exercise_id = make_exercise()

  response = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_id, 'exercise_order': 1},
    headers=_auth_headers(intruder)
  )
  assert response.status_code == 404

  owned = client.get(f"/api/workout-sessions/{session['id']}/exercises", headers=_auth_headers(owner)).get_json()
  assert owned == []

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_cannot_list_another_users_session_exercises(client, make_auth_user, make_exercise):
  owner = make_auth_user()
  intruder = make_auth_user()
  session = _create_session(client, owner)
  exercise_id = make_exercise()
  client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_id, 'exercise_order': 1}, headers=_auth_headers(owner)
  )

  response = client.get(f"/api/workout-sessions/{session['id']}/exercises", headers=_auth_headers(intruder))
  assert response.status_code == 404

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_nonexistent_session_returns_404(client, make_auth_user):
  user = make_auth_user()

  response = client.get(f"/api/workout-sessions/{uuid.uuid4()}/exercises", headers=_auth_headers(user))
  assert response.status_code == 404

  response = client.post(
    f"/api/workout-sessions/{uuid.uuid4()}/exercises",
    json={'exercise_id': str(uuid.uuid4()), 'exercise_order': 1},
    headers=_auth_headers(user)
  )
  assert response.status_code == 404


def test_nonexistent_exercise_id_handled_via_fk_constraint(client, make_auth_user):
  user = make_auth_user()
  session = _create_session(client, user)

  response = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': str(uuid.uuid4()), 'exercise_order': 1},
    headers=_auth_headers(user)
  )
  assert response.status_code == 404
  assert response.get_json() == ['exercise_not_found']

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_malformed_exercise_id_returns_422(client, make_auth_user):
  user = make_auth_user()
  session = _create_session(client, user)

  response = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': 'not-a-uuid', 'exercise_order': 1},
    headers=_auth_headers(user)
  )
  assert response.status_code == 422

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_duplicate_exercise_order_handled_via_unique_constraint(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_a = make_exercise()
  exercise_b = make_exercise()

  first = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_a, 'exercise_order': 1}, headers=_auth_headers(user)
  )
  assert first.status_code == 201

  second = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_b, 'exercise_order': 1}, headers=_auth_headers(user)
  )
  assert second.status_code == 409

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_non_positive_exercise_order_handled_via_check_constraint(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()

  response = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_id, 'exercise_order': 0},
    headers=_auth_headers(user)
  )
  assert response.status_code == 422

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_missing_required_fields_rejected(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()

  missing_order = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_id}, headers=_auth_headers(user)
  )
  assert missing_order.status_code == 422
  assert 'exercise_order_blank' in missing_order.get_json()

  missing_exercise = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_order': 1}, headers=_auth_headers(user)
  )
  assert missing_exercise.status_code == 422
  assert 'exercise_id_blank' in missing_exercise.get_json()

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_invalid_exercise_order_type_rejected(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()

  response = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_id, 'exercise_order': 'first'},
    headers=_auth_headers(user)
  )
  assert response.status_code == 422
  assert 'exercise_order_invalid' in response.get_json()

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_malformed_json_rejected(client, make_auth_user):
  user = make_auth_user()
  session = _create_session(client, user)

  headers = _auth_headers(user)
  headers['Content-Type'] = 'application/json'
  response = client.post(f"/api/workout-sessions/{session['id']}/exercises", data='not valid json', headers=headers)
  assert response.status_code == 422

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_supplied_user_id_does_not_change_ownership(client, make_auth_user, make_exercise):
  user = make_auth_user()
  other = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()

  response = client.post(
    f"/api/workout-sessions/{session['id']}/exercises",
    json={'exercise_id': exercise_id, 'exercise_order': 1, 'user_id': other['uuid']},
    headers=_auth_headers(user)
  )
  assert response.status_code == 201

  # ownership is still the session's, unaffected by a client-supplied user_id
  hidden = client.get(f"/api/workout-sessions/{session['id']}/exercises", headers=_auth_headers(other))
  assert hidden.status_code == 404

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_session_exercise_routes_require_authentication(client):
  response = client.get(f"/api/workout-sessions/{uuid.uuid4()}/exercises")
  assert response.status_code == 401
