import base64
import io
import json
import os
import uuid
from unittest import mock

os.environ.setdefault('AWS_DEFAULT_REGION', 'eu-central-1')


def _fake_urlopen(url, *args, **kwargs):
  return io.BytesIO(json.dumps({"keys": []}).encode())


with mock.patch('urllib.request.urlopen', _fake_urlopen):
  import app as app_module

import pytest

from lib.db import execute, query_array_json

flask_app = app_module.app

PNG_1X1 = base64.b64decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)
JPEG_BYTES = b'\xff\xd8\xff\xe0' + b'0' * 64


def _data_url(data, declared='png'):
  return f"data:image/{declared};base64,{base64.b64encode(data).decode()}"


@pytest.fixture(autouse=True)
def fake_cognito_verify(monkeypatch):
  monkeypatch.setattr(app_module.cognito_jwt_token, 'verify', lambda token: {'username': token})


@pytest.fixture
def client(db_available):
  flask_app.config['TESTING'] = True
  return flask_app.test_client()


@pytest.fixture
def make_user(db_available):
  created = []

  def _make():
    suffix = uuid.uuid4().hex[:12]
    row = execute(
      "INSERT INTO public.users (display_name, handle, cognito_user_id) VALUES (%s, %s, %s) RETURNING uuid, cognito_user_id",
      (f'Profile Test {suffix}', f'profile-test-{suffix}', f'cognito-{suffix}')
    )
    created.append(row['uuid'])
    return row

  yield _make

  for user_uuid in created:
    execute("DELETE FROM public.workout_sessions WHERE user_id = %s", (user_uuid,))
    execute("DELETE FROM public.users WHERE uuid = %s", (user_uuid,))


def _auth(user):
  return {'Authorization': f"Bearer {user['cognito_user_id']}"}


def test_every_profile_route_requires_a_signed_in_user(client):
  for method, path in [('get', '/api/me'), ('patch', '/api/me'), ('put', '/api/me/avatar'), ('delete', '/api/me/avatar'), ('delete', '/api/me')]:
    assert getattr(client, method)(path).status_code == 401, f'{method} {path}'


def test_get_profile_returns_own_fields_and_no_avatar_by_default(client, make_user):
  user = make_user()
  response = client.get('/api/me', headers=_auth(user))
  assert response.status_code == 200
  assert response.headers['Cache-Control'] == 'no-store'
  body = response.get_json()
  assert set(body) == {'handle', 'display_name', 'avatar', 'avatar_updated_at'}
  assert body['avatar'] is None and body['avatar_updated_at'] is None
  assert body['handle'].startswith('profile-test-')


def test_display_name_is_trimmed_and_validated(client, make_user):
  user = make_user()
  ok = client.patch('/api/me', json={'display_name': '  Harry the Lifter  '}, headers=_auth(user))
  assert ok.status_code == 200 and ok.get_json()['display_name'] == 'Harry the Lifter'
  for bad in ['', '   ', 'x' * 51, None, 123]:
    assert client.patch('/api/me', json={'display_name': bad}, headers=_auth(user)).status_code == 422
  assert client.patch('/api/me', json={}, headers=_auth(user)).status_code == 422


def test_avatar_round_trips_and_is_typed_from_its_bytes(client, make_user):
  user = make_user()
  response = client.put('/api/me/avatar', json={'image': _data_url(PNG_1X1, declared='jpeg')}, headers=_auth(user))
  assert response.status_code == 200
  avatar = response.get_json()['avatar']
  assert avatar.startswith('data:image/png;base64,')
  assert base64.b64decode(avatar.split(',', 1)[1]) == PNG_1X1
  assert response.get_json()['avatar_updated_at'] is not None

  assert client.get('/api/me', headers=_auth(user)).get_json()['avatar'] == avatar

  jpeg = client.put('/api/me/avatar', json={'image': _data_url(JPEG_BYTES, declared='jpeg')}, headers=_auth(user))
  assert jpeg.get_json()['avatar'].startswith('data:image/jpeg;base64,')


@pytest.mark.parametrize('image', [
  None, 123, '', 'not a data url', 'data:text/plain;base64,aGVsbG8=', 'data:image/png;base64,***',
  _data_url(b'this is not an image at all'),
])
def test_invalid_avatars_are_rejected(client, make_user, image):
  user = make_user()
  response = client.put('/api/me/avatar', json={'image': image}, headers=_auth(user))
  assert response.status_code == 422
  assert client.get('/api/me', headers=_auth(user)).get_json()['avatar'] is None


def test_oversized_avatar_is_rejected(client, make_user):
  user = make_user()
  big = PNG_1X1 + b'0' * (256 * 1024)
  response = client.put('/api/me/avatar', json={'image': _data_url(big)}, headers=_auth(user))
  assert response.status_code == 422
  assert response.get_json() == ['avatar_too_large']


def test_avatar_can_be_removed(client, make_user):
  user = make_user()
  client.put('/api/me/avatar', json={'image': _data_url(PNG_1X1)}, headers=_auth(user))
  response = client.delete('/api/me/avatar', headers=_auth(user))
  assert response.status_code == 200
  assert response.get_json()['avatar'] is None


def test_avatars_are_per_user(client, make_user):
  first, second = make_user(), make_user()
  client.put('/api/me/avatar', json={'image': _data_url(PNG_1X1)}, headers=_auth(first))
  assert client.get('/api/me', headers=_auth(second)).get_json()['avatar'] is None


def test_deleting_the_account_removes_the_user_and_all_their_workouts_only(client, make_user):
  doomed, bystander = make_user(), make_user()
  for user in (doomed, bystander):
    created = client.post('/api/workout-sessions', json={'started_at': '2026-01-01T10:00:00+00:00'}, headers=_auth(user)).get_json()
    assert created['id']

  response = client.delete('/api/me', headers=_auth(doomed))
  assert response.status_code == 204
  assert response.headers['Cache-Control'] == 'no-store'

  assert query_array_json("SELECT 1 FROM public.users WHERE uuid = %s", (doomed['uuid'],)) == []
  assert query_array_json("SELECT 1 FROM public.workout_sessions WHERE user_id = %s", (doomed['uuid'],)) == []
  assert len(query_array_json("SELECT 1 FROM public.workout_sessions WHERE user_id = %s", (bystander['uuid'],))) == 1
  assert len(query_array_json("SELECT 1 FROM public.users WHERE uuid = %s", (bystander['uuid'],))) == 1


def test_request_bodies_over_the_limit_are_refused(client, make_user):
  user = make_user()
  response = client.put('/api/me/avatar', data=b'x' * (1024 * 1024 + 10), content_type='application/json', headers=_auth(user))
  assert response.status_code == 413
