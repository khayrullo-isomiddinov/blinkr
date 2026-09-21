import io
import json
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from unittest import mock

# CognitoJwtToken.__init__ needs a truthy region, so set a default before importing app.py.
os.environ.setdefault('AWS_DEFAULT_REGION', 'eu-central-1')


def _fake_urlopen(url, *args, **kwargs):
  # app.py fetches the Cognito JWKS at import time; faked so tests never touch AWS.
  return io.BytesIO(json.dumps({"keys": []}).encode())


with mock.patch('urllib.request.urlopen', _fake_urlopen):
  import app as app_module

import psycopg2
import pytest
from psycopg2.extensions import make_dsn, parse_dsn

import admin.overview as overview_module
from admin.overview import RECENT_ACTIVITY_LIMIT
from lib.cognito_jwt_token import TokenVerifyError
from lib.db import execute, query_array_json
from repositories.admin_recent_completed_workouts import AdminRecentCompletedWorkouts

flask_app = app_module.app
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'schema.sql')


@pytest.fixture
def client():
  flask_app.config['TESTING'] = True
  return flask_app.test_client()


@pytest.fixture
def register_token(monkeypatch):
  table = {}

  def _verify(token):
    if token not in table:
      raise TokenVerifyError('Malformed token')
    return table[token]

  monkeypatch.setattr(app_module.cognito_jwt_token, 'verify', _verify)

  def _register(groups):
    token = f'token-{len(table)}'
    table[token] = {
      'username': 'someone', 'token_use': 'access', 'cognito:groups': groups,
      'exp': int(time.time()) + 3600, 'client_id': 'test-client',
    }
    return {'Authorization': f'Bearer {token}'}

  return _register


@pytest.fixture
def admin_headers(register_token):
  return register_token(['admin'])


@pytest.fixture
def make_outbox_event(db_available):
  created = []

  def _make(published=False, attempts=0):
    event_id = str(uuid.uuid4())
    execute(
      "INSERT INTO public.outbox_events (event_id, event_type, payload, published_at, attempts) "
      "VALUES (%s, 'workout.session.completed', '{}'::jsonb, CASE WHEN %s THEN current_timestamp END, %s)",
      (event_id, published, attempts)
    )
    created.append(event_id)
    return event_id

  yield _make

  for event_id in created:
    execute("DELETE FROM public.outbox_events WHERE event_id = %s", (event_id,))


def _get(client, headers):
  response = client.get('/api/admin/overview', headers=headers)
  assert response.status_code == 200, response.get_data(as_text=True)
  return response.get_json()


# --- authorization ----------------------------------------------------------


def test_overview_requires_authentication(client):
  response = client.get('/api/admin/overview')
  assert response.status_code == 401
  assert response.headers['Cache-Control'] == 'no-store'


def test_overview_rejects_non_admins(client, register_token):
  response = client.get('/api/admin/overview', headers=register_token(['users']))
  assert response.status_code == 403
  assert response.get_json() == {'errors': ['admin_required']}
  assert response.headers['Cache-Control'] == 'no-store'


def test_overview_never_touches_the_database_for_unauthorized_callers(client, register_token, monkeypatch):
  def _boom():
    raise AssertionError('overview must not run for unauthorized callers')

  monkeypatch.setattr(overview_module, 'build_overview', _boom)
  monkeypatch.setattr('admin.routes.build_overview', _boom)
  assert client.get('/api/admin/overview').status_code == 401
  assert client.get('/api/admin/overview', headers=register_token(['users'])).status_code == 403


def test_overview_is_read_only_over_http(client, admin_headers):
  for method in ('post', 'put', 'patch', 'delete'):
    assert getattr(client, method)('/api/admin/overview', headers=admin_headers).status_code == 405


# --- response contract ------------------------------------------------------


def test_admin_gets_the_documented_shape_and_no_store(client, admin_headers, db_available):
  response = client.get('/api/admin/overview', headers=admin_headers)
  assert response.status_code == 200
  assert response.headers['Cache-Control'] == 'no-store'

  body = response.get_json()
  assert set(body) == {'generated_at', 'users', 'workouts', 'exercises', 'events', 'recent_activity'}
  assert set(body['users']) == {'total'}
  assert set(body['workouts']) == {'total', 'completed'}
  assert set(body['exercises']) == {'total'}
  assert set(body['events']) == {'total', 'published', 'pending', 'failed_attempts'}
  assert isinstance(body['recent_activity'], list)
  for value in (body['users']['total'], body['workouts']['total'], body['events']['total']):
    assert isinstance(value, int)
  assert re.fullmatch(r'\d{4}-\d\d-\d\dT[\d:.]+Z', body['generated_at'])


def test_overview_runs_in_a_read_only_transaction(client, admin_headers, db_available, monkeypatch):
  seen = {}
  real = overview_module.AdminOverviewCounts.run

  def _spy(conn=None):
    seen['read_only'] = query_array_json('SHOW transaction_read_only', conn=conn)[0]['transaction_read_only']
    return real(conn=conn)

  monkeypatch.setattr(overview_module.AdminOverviewCounts, 'run', _spy)
  _get(client, admin_headers)
  assert seen['read_only'] == 'on'


# --- real counts ------------------------------------------------------------


def test_counts_reflect_the_database(client, admin_headers, demo_user, make_exercise, make_workout_session, make_outbox_event):
  before = _get(client, admin_headers)

  make_exercise()
  make_exercise()
  make_exercise()
  make_workout_session(demo_user['uuid'])
  make_workout_session(demo_user['uuid'])
  make_workout_session(demo_user['uuid'], completed_at=datetime.now(timezone.utc))

  after = _get(client, admin_headers)

  assert after['users']['total'] == before['users']['total']
  assert after['exercises']['total'] == before['exercises']['total'] + 3
  assert after['workouts']['total'] == before['workouts']['total'] + 3
  assert after['workouts']['completed'] == before['workouts']['completed'] + 1


def test_event_counts_split_published_pending_and_attempted(client, admin_headers, make_outbox_event):
  before = _get(client, admin_headers)['events']

  make_outbox_event(published=True)
  make_outbox_event(published=True, attempts=2)
  make_outbox_event(published=False)
  make_outbox_event(published=False, attempts=3)
  make_outbox_event(published=False, attempts=1)

  after = _get(client, admin_headers)['events']

  assert after['total'] == before['total'] + 5
  assert after['published'] == before['published'] + 2
  assert after['pending'] == before['pending'] + 3
  assert after['failed_attempts'] == before['failed_attempts'] + 3
  assert after['published'] + after['pending'] == after['total']


# --- recent activity --------------------------------------------------------


def test_recent_activity_is_newest_first_and_capped(client, admin_headers, demo_user, make_workout_session):
  base = datetime.now(timezone.utc) + timedelta(days=365 * 40)
  created = []
  for i in range(RECENT_ACTIVITY_LIMIT + 3):
    created.append((make_workout_session(demo_user['uuid'], completed_at=base + timedelta(minutes=i)), base + timedelta(minutes=i)))
  make_workout_session(demo_user['uuid'])  # in progress: must never appear

  activity = _get(client, admin_headers)['recent_activity']

  assert len(activity) == RECENT_ACTIVITY_LIMIT
  expected = [str(session_id) for session_id, _ in reversed(created)][:RECENT_ACTIVITY_LIMIT]
  assert [row['workout_session_id'] for row in activity] == expected
  stamps = [row['completed_at'] for row in activity]
  assert stamps == sorted(stamps, reverse=True)


def test_recent_activity_rows_carry_only_ids_and_a_utc_timestamp(client, admin_headers, demo_user, make_workout_session):
  completed = datetime.now(timezone.utc) + timedelta(days=365 * 41)
  session_id = make_workout_session(demo_user['uuid'], completed_at=completed)

  row = _get(client, admin_headers)['recent_activity'][0]

  assert set(row) == {'workout_session_id', 'user_id', 'completed_at'}
  assert row['workout_session_id'] == str(session_id)
  assert row['user_id'] == str(demo_user['uuid'])
  assert row['completed_at'].endswith('Z')
  assert datetime.fromisoformat(row['completed_at'].replace('Z', '+00:00')) == completed


def test_no_personal_fields_or_emails_in_the_response(client, admin_headers, demo_user, make_workout_session):
  make_workout_session(demo_user['uuid'], completed_at=datetime.now(timezone.utc) + timedelta(days=365 * 42), notes='private note')

  text = client.get('/api/admin/overview', headers=admin_headers).get_data(as_text=True)

  assert '@' not in text
  assert 'private note' not in text
  for field in ('email', 'handle', 'display_name', 'cognito_user_id', 'notes'):
    assert field not in text
  assert demo_user['handle'] not in text


def test_recent_activity_limit_is_clamped_in_the_repository(db_available):
  assert len(AdminRecentCompletedWorkouts.run(10_000)) <= 50
  assert len(AdminRecentCompletedWorkouts.run(0)) <= 1
  assert len(AdminRecentCompletedWorkouts.run(-5)) <= 1


# --- an empty database ------------------------------------------------------


@pytest.fixture
def empty_database(db_available, monkeypatch):
  # A throwaway database built from the real schema: no seed, no rows anywhere.
  base = os.getenv('DATABASE_URL') or os.getenv('CONNECTION_URL')
  dsn = parse_dsn(base)
  name = f'blinkr_empty_{uuid.uuid4().hex[:10]}'
  try:
    admin_conn = psycopg2.connect(make_dsn(**{**dsn, 'dbname': 'postgres'}))
  except psycopg2.Error as e:
    pytest.skip(f'cannot open a maintenance connection to create a scratch database: {e}')
  admin_conn.autocommit = True
  try:
    admin_conn.cursor().execute(f'CREATE DATABASE {name}')
  except psycopg2.Error as e:
    admin_conn.close()
    pytest.skip(f'cannot create a scratch database: {e}')

  empty_dsn = make_dsn(**{**dsn, 'dbname': name})
  try:
    with psycopg2.connect(empty_dsn) as conn:
      with conn.cursor() as cur:
        cur.execute(open(SCHEMA_PATH).read())
    monkeypatch.setenv('DATABASE_URL', empty_dsn)
    yield
  finally:
    monkeypatch.undo()
    admin_conn.cursor().execute(f'DROP DATABASE IF EXISTS {name} WITH (FORCE)')
    admin_conn.close()


def test_empty_database_returns_zeros_and_an_empty_activity_list(client, admin_headers, empty_database):
  body = _get(client, admin_headers)

  assert body['users'] == {'total': 0}
  assert body['workouts'] == {'total': 0, 'completed': 0}
  assert body['exercises'] == {'total': 0}
  assert body['events'] == {'total': 0, 'published': 0, 'pending': 0, 'failed_attempts': 0}
  assert body['recent_activity'] == []
