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
  # touching any actual Cognito configuration. Same approach as the other
  # API test files.
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


def _add_session_exercise(client, user, session_id, exercise_id, exercise_order=1):
  return client.post(
    f"/api/workout-sessions/{session_id}/exercises",
    json={'exercise_id': exercise_id, 'exercise_order': exercise_order},
    headers=_auth_headers(user)
  ).get_json()


def _sets_url(session_id, session_exercise_id):
  return f"/api/workout-sessions/{session_id}/exercises/{session_exercise_id}/sets"


def test_add_set_to_own_session_exercise(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  response = client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 8, 'weight': 30.0, 'weight_unit': 'kg', 'set_order': 1, 'set_type': 'working'},
    headers=_auth_headers(user)
  )

  assert response.status_code == 201
  body = response.get_json()
  assert body['session_exercise_id'] == session_exercise['id']
  assert body['reps'] == 8
  assert float(body['weight']) == 30.0
  assert body['weight_unit'] == 'kg'
  assert body['set_order'] == 1
  assert body['set_type'] == 'working'

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_list_sets_from_own_session_exercise(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)
  client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 10, 'set_order': 1}, headers=_auth_headers(user)
  )

  response = client.get(_sets_url(session['id'], session_exercise['id']), headers=_auth_headers(user))
  assert response.status_code == 200
  rows = response.get_json()
  assert len(rows) == 1
  assert rows[0]['reps'] == 10

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_sets_returned_in_order(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  client.post(_sets_url(session['id'], session_exercise['id']),
              json={'reps': 8, 'set_order': 2}, headers=_auth_headers(user))
  client.post(_sets_url(session['id'], session_exercise['id']),
              json={'reps': 10, 'set_order': 1}, headers=_auth_headers(user))

  response = client.get(_sets_url(session['id'], session_exercise['id']), headers=_auth_headers(user))
  rows = response.get_json()
  assert [row['set_order'] for row in rows] == [1, 2]

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_cannot_add_set_to_another_users_session_exercise(client, make_auth_user, make_exercise):
  owner = make_auth_user()
  intruder = make_auth_user()
  session = _create_session(client, owner)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, owner, session['id'], exercise_id)

  response = client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 8, 'set_order': 1},
    headers=_auth_headers(intruder)
  )
  assert response.status_code == 404

  owned = client.get(_sets_url(session['id'], session_exercise['id']), headers=_auth_headers(owner)).get_json()
  assert owned == []

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_cannot_list_another_users_sets(client, make_auth_user, make_exercise):
  owner = make_auth_user()
  intruder = make_auth_user()
  session = _create_session(client, owner)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, owner, session['id'], exercise_id)
  client.post(_sets_url(session['id'], session_exercise['id']),
              json={'reps': 8, 'set_order': 1}, headers=_auth_headers(owner))

  response = client.get(_sets_url(session['id'], session_exercise['id']), headers=_auth_headers(intruder))
  assert response.status_code == 404

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_nonexistent_session_returns_404(client, make_auth_user):
  user = make_auth_user()
  response = client.get(_sets_url(uuid.uuid4(), uuid.uuid4()), headers=_auth_headers(user))
  assert response.status_code == 404
  assert response.get_json()['errors'] == ['workout_session_not_found']


def test_nonexistent_session_exercise_returns_404(client, make_auth_user):
  user = make_auth_user()
  session = _create_session(client, user)

  response = client.get(_sets_url(session['id'], uuid.uuid4()), headers=_auth_headers(user))
  assert response.status_code == 404
  assert response.get_json()['errors'] == ['session_exercise_not_found']

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_session_exercise_from_another_session_is_treated_as_not_found(client, make_auth_user, make_exercise):
  # a session_exercise_id that's real, and even owned by the same user, but
  # doesn't belong to *this* path's session_id must still 404 -- otherwise
  # the ownership chain could be bypassed by mixing a valid session_id with
  # someone else's (or a different) session_exercise_id.
  user = make_auth_user()
  session_a = _create_session(client, user)
  session_b = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise_on_b = _add_session_exercise(client, user, session_b['id'], exercise_id)

  response = client.post(
    _sets_url(session_a['id'], session_exercise_on_b['id']),
    json={'reps': 8, 'set_order': 1},
    headers=_auth_headers(user)
  )
  assert response.status_code == 404
  assert response.get_json()['errors'] == ['session_exercise_not_found']

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session_a['id'],))
  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session_b['id'],))


def test_duplicate_set_order_handled_via_unique_constraint(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  first = client.post(_sets_url(session['id'], session_exercise['id']),
                       json={'reps': 8, 'set_order': 1}, headers=_auth_headers(user))
  assert first.status_code == 201

  second = client.post(_sets_url(session['id'], session_exercise['id']),
                        json={'reps': 5, 'set_order': 1}, headers=_auth_headers(user))
  assert second.status_code == 409

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_invalid_set_type_handled_via_check_constraint(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  response = client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 8, 'set_order': 1, 'set_type': 'not-a-real-type'},
    headers=_auth_headers(user)
  )
  assert response.status_code == 422

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_invalid_weight_unit_handled_via_check_constraint(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  response = client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 8, 'weight': 20, 'weight_unit': 'stone', 'set_order': 1},
    headers=_auth_headers(user)
  )
  assert response.status_code == 422

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_invalid_set_order_handled_via_check_constraint(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  response = client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 8, 'set_order': 0},
    headers=_auth_headers(user)
  )
  assert response.status_code == 422

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_bodyweight_set_without_weight_can_be_created(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  response = client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 15, 'set_order': 1},
    headers=_auth_headers(user)
  )
  assert response.status_code == 201
  body = response.get_json()
  assert body['weight'] is None
  assert body['weight_unit'] is None
  assert body['set_type'] == 'working'

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_missing_required_fields_rejected(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  missing_reps = client.post(_sets_url(session['id'], session_exercise['id']),
                              json={'set_order': 1}, headers=_auth_headers(user))
  assert missing_reps.status_code == 422
  assert 'reps_blank' in missing_reps.get_json()

  missing_order = client.post(_sets_url(session['id'], session_exercise['id']),
                               json={'reps': 8}, headers=_auth_headers(user))
  assert missing_order.status_code == 422
  assert 'set_order_blank' in missing_order.get_json()

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_invalid_basic_types_rejected(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  response = client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 'eight', 'set_order': 1},
    headers=_auth_headers(user)
  )
  assert response.status_code == 422
  assert 'reps_invalid' in response.get_json()

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_malformed_json_rejected(client, make_auth_user, make_exercise):
  user = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  headers = _auth_headers(user)
  headers['Content-Type'] = 'application/json'
  response = client.post(_sets_url(session['id'], session_exercise['id']), data='not valid json', headers=headers)
  assert response.status_code == 422

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_supplied_user_id_does_not_affect_ownership(client, make_auth_user, make_exercise):
  user = make_auth_user()
  other = make_auth_user()
  session = _create_session(client, user)
  exercise_id = make_exercise()
  session_exercise = _add_session_exercise(client, user, session['id'], exercise_id)

  response = client.post(
    _sets_url(session['id'], session_exercise['id']),
    json={'reps': 8, 'set_order': 1, 'user_id': other['uuid']},
    headers=_auth_headers(user)
  )
  assert response.status_code == 201

  hidden = client.get(_sets_url(session['id'], session_exercise['id']), headers=_auth_headers(other))
  assert hidden.status_code == 404

  execute("DELETE FROM public.workout_sessions WHERE id = %s", (session['id'],))


def test_sets_routes_require_authentication(client):
  response = client.get(_sets_url(uuid.uuid4(), uuid.uuid4()))
  assert response.status_code == 401
