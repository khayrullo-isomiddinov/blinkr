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
  # touching any actual Cognito configuration.
  return io.BytesIO(json.dumps({"keys": []}).encode())


with mock.patch('urllib.request.urlopen', _fake_urlopen):
  from app import app as flask_app

import pytest

from lib.db import execute


@pytest.fixture
def client(db_available):
  flask_app.config['TESTING'] = True
  return flask_app.test_client()


def test_create_exercise_success(client):
  name = f"API Test Exercise {uuid.uuid4().hex[:8]}"
  response = client.post('/api/exercises', json={
    'name': name,
    'muscle_group': 'chest',
    'equipment': 'barbell',
  })

  assert response.status_code == 201
  body = response.get_json()
  assert body['id'] is not None
  assert body['name'] == name
  assert body['muscle_group'] == 'chest'
  assert body['equipment'] == 'barbell'

  execute("DELETE FROM public.exercises WHERE id = %s", (body['id'],))


def test_list_exercises(client):
  name = f"API Test Exercise {uuid.uuid4().hex[:8]}"
  created = client.post('/api/exercises', json={'name': name, 'muscle_group': 'back'}).get_json()

  response = client.get('/api/exercises')
  assert response.status_code == 200
  body = response.get_json()
  assert any(row['id'] == created['id'] for row in body)

  execute("DELETE FROM public.exercises WHERE id = %s", (created['id'],))


def test_get_exercise_by_id(client):
  name = f"API Test Exercise {uuid.uuid4().hex[:8]}"
  created = client.post('/api/exercises', json={'name': name, 'muscle_group': 'legs'}).get_json()

  response = client.get(f"/api/exercises/{created['id']}")
  assert response.status_code == 200
  assert response.get_json()['id'] == created['id']

  execute("DELETE FROM public.exercises WHERE id = %s", (created['id'],))


def test_get_nonexistent_exercise_returns_404(client):
  response = client.get(f"/api/exercises/{uuid.uuid4()}")
  assert response.status_code == 404
  assert response.get_json()['errors'] == ['exercise_not_found']


def test_get_exercise_with_malformed_id_returns_404(client):
  response = client.get('/api/exercises/not-a-uuid')
  assert response.status_code == 404


def test_create_exercise_missing_required_fields(client):
  response = client.post('/api/exercises', json={'equipment': 'dumbbell'})
  assert response.status_code == 422
  errors = response.get_json()
  assert 'name_blank' in errors
  assert 'muscle_group_blank' in errors


def test_create_exercise_rejects_malformed_json(client):
  response = client.post(
    '/api/exercises',
    data='not valid json',
    content_type='application/json'
  )
  assert response.status_code == 422


def test_create_exercise_duplicate_name_returns_409(client):
  name = f"API Test Exercise {uuid.uuid4().hex[:8]}"
  first = client.post('/api/exercises', json={'name': name, 'muscle_group': 'chest'})
  assert first.status_code == 201
  created_id = first.get_json()['id']

  second = client.post('/api/exercises', json={'name': name, 'muscle_group': 'back'})
  assert second.status_code == 409

  execute("DELETE FROM public.exercises WHERE id = %s", (created_id,))
