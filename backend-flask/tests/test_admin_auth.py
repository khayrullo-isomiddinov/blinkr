import base64
import io
import json
import os
import re
import time
from unittest import mock

# CognitoJwtToken.__init__ needs a truthy region, so set a default before importing app.py.
os.environ.setdefault('AWS_DEFAULT_REGION', 'eu-central-1')


def _fake_urlopen(url, *args, **kwargs):
  # app.py fetches the Cognito JWKS at import time; faked so tests never touch AWS.
  return io.BytesIO(json.dumps({"keys": []}).encode())


with mock.patch('urllib.request.urlopen', _fake_urlopen):
  import app as app_module

import pytest

import lib.auth
from lib.auth import resolve_admin, AuthError, ForbiddenError
from lib.cognito_jwt_token import TokenVerifyError

flask_app = app_module.app


def _claims(**overrides):
  claims = {
    'username': 'admin-user',
    'token_use': 'access',
    'cognito:groups': ['admin'],
    'exp': int(time.time()) + 3600,
    'client_id': 'test-client',
  }
  claims.update(overrides)
  # None means "leave this claim out"
  return {k: v for k, v in claims.items() if v is not None}


@pytest.fixture
def client():
  flask_app.config['TESTING'] = True
  return flask_app.test_client()


@pytest.fixture
def register_token(monkeypatch):
  # Lets each test decide what a bearer token verifies to (claims) or raises.
  table = {}

  def _verify(token):
    if token not in table:
      raise TokenVerifyError('Malformed token')
    outcome = table[token]
    if isinstance(outcome, Exception):
      raise outcome
    return outcome

  monkeypatch.setattr(app_module.cognito_jwt_token, 'verify', _verify)

  def _register(claims_or_error):
    token = f'token-{len(table)}'
    table[token] = claims_or_error
    return {'Authorization': f'Bearer {token}'}

  return _register


def _assert_no_store(response):
  assert response.headers['Cache-Control'] == 'no-store'


# --- authorization matrix -------------------------------------------------


def test_missing_token_is_401(client, register_token):
  response = client.get('/api/admin/me')
  assert response.status_code == 401
  assert response.get_json() == {'errors': ['missing_bearer_token']}
  _assert_no_store(response)


def test_malformed_authorization_header_is_401(client, register_token):
  response = client.get('/api/admin/me', headers={'Authorization': 'Token abc'})
  assert response.status_code == 401
  _assert_no_store(response)


def test_unverifiable_token_is_401(client, register_token):
  response = client.get('/api/admin/me', headers={'Authorization': 'Bearer never-registered'})
  assert response.status_code == 401
  assert response.get_json()['errors'][0].startswith('invalid_token')
  _assert_no_store(response)


def test_expired_token_rejected_by_verifier_is_401(client, register_token):
  headers = register_token(TokenVerifyError('Token is expired'))
  response = client.get('/api/admin/me', headers=headers)
  assert response.status_code == 401
  assert 'expired' in response.get_json()['errors'][0]


def test_expired_exp_claim_is_401_even_if_verifier_passes_it(client, register_token):
  headers = register_token(_claims(exp=int(time.time()) - 10))
  response = client.get('/api/admin/me', headers=headers)
  assert response.status_code == 401
  assert response.get_json() == {'errors': ['token_expired']}


def test_missing_exp_claim_is_401(client, register_token):
  headers = register_token(_claims(exp=None))
  assert client.get('/api/admin/me', headers=headers).status_code == 401


def test_id_token_is_401(client, register_token):
  headers = register_token(_claims(token_use='id'))
  response = client.get('/api/admin/me', headers=headers)
  assert response.status_code == 401
  assert response.get_json() == {'errors': ['invalid_token_use']}


def test_missing_token_use_is_401(client, register_token):
  headers = register_token(_claims(token_use=None))
  assert client.get('/api/admin/me', headers=headers).status_code == 401


def test_missing_username_is_401(client, register_token):
  headers = register_token(_claims(username=None))
  assert client.get('/api/admin/me', headers=headers).status_code == 401


def test_unexpected_verifier_exception_is_401_not_500(client, register_token):
  headers = register_token(ValueError('something odd inside the verifier'))
  response = client.get('/api/admin/me', headers=headers)
  assert response.status_code == 401
  assert response.get_json() == {'errors': ['invalid_token']}


def test_access_token_without_admin_group_is_403(client, register_token):
  headers = register_token(_claims(**{'cognito:groups': ['users']}))
  response = client.get('/api/admin/me', headers=headers)
  assert response.status_code == 403
  assert response.get_json() == {'errors': ['admin_required']}
  _assert_no_store(response)


def test_access_token_with_no_groups_claim_is_403(client, register_token):
  headers = register_token(_claims(**{'cognito:groups': None}))
  response = client.get('/api/admin/me', headers=headers)
  assert response.status_code == 403
  _assert_no_store(response)


def test_empty_groups_list_is_403(client, register_token):
  headers = register_token(_claims(**{'cognito:groups': []}))
  assert client.get('/api/admin/me', headers=headers).status_code == 403


@pytest.mark.parametrize('groups', ['admin', 'administrators', ['administrators'], ['Admin'], ['admin-readonly'], {'admin': True}, 1])
def test_malformed_or_lookalike_groups_never_grant_access(client, register_token, groups):
  # a string "admin"/"administrators" would pass a naive `in` check
  headers = register_token(_claims(**{'cognito:groups': groups}))
  assert client.get('/api/admin/me', headers=headers).status_code == 403


def test_admin_gets_200_with_verified_claims(client, register_token):
  exp = int(time.time()) + 1800
  headers = register_token(_claims(username='harry', exp=exp, **{'cognito:groups': ['admin']}))
  response = client.get('/api/admin/me', headers=headers)
  assert response.status_code == 200
  assert response.get_json() == {'username': 'harry', 'groups': ['admin'], 'expires_at': exp}
  _assert_no_store(response)


def test_admin_among_several_groups_is_allowed(client, register_token):
  headers = register_token(_claims(**{'cognito:groups': ['users', 'admin']}))
  response = client.get('/api/admin/me', headers=headers)
  assert response.status_code == 200
  assert response.get_json()['groups'] == ['users', 'admin']


def test_options_passes_through_the_guard(client, register_token):
  response = client.options('/api/admin/me')
  assert response.status_code not in (401, 403)
  _assert_no_store(response)


# --- no database involvement ---------------------------------------------


def test_admin_me_needs_no_public_users_row(client, register_token, monkeypatch):
  # any PostgreSQL access from the auth path blows up here
  def _no_db(*args, **kwargs):
    raise AssertionError('admin authorization must not query PostgreSQL')

  monkeypatch.setattr(lib.auth, 'query_array_json', _no_db)
  monkeypatch.setattr('lib.db.get_connection', _no_db)

  headers = register_token(_claims(username='not-in-public-users-anywhere'))
  response = client.get('/api/admin/me', headers=headers)

  assert response.status_code == 200
  assert response.get_json()['username'] == 'not-in-public-users-anywhere'


# --- the real verifier (not faked) must also fail closed as 401 ----------


def _b64(obj):
  return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b'=').decode()


@pytest.mark.parametrize('token', [
  'garbage',
  'a.b.c',
  f"{_b64({'kid': 'no-such-key', 'alg': 'RS256'})}.{_b64({'username': 'x'})}.c2ln",
])
def test_real_verifier_rejects_malformed_tokens_with_401(client, token):
  response = client.get('/api/admin/me', headers={'Authorization': f'Bearer {token}'})
  assert response.status_code == 401
  _assert_no_store(response)


# --- resolve_admin unit level --------------------------------------------


class FakeVerifier:
  def __init__(self, claims):
    self._claims = claims

  def verify(self, token):
    return self._claims


def test_resolve_admin_returns_only_verified_claim_fields():
  result = resolve_admin({'Authorization': 'Bearer t'}, FakeVerifier(_claims(username='u')))
  assert set(result) == {'username', 'groups', 'expires_at'}


def test_resolve_admin_error_types_are_distinct():
  with pytest.raises(AuthError):
    resolve_admin({}, FakeVerifier(_claims()))
  with pytest.raises(ForbiddenError):
    resolve_admin({'Authorization': 'Bearer t'}, FakeVerifier(_claims(**{'cognito:groups': ['users']})))
  # ForbiddenError must not be mistaken for a 401 by `except AuthError`
  assert not issubclass(ForbiddenError, AuthError)


# --- regression: every /api/admin route is centrally guarded -------------


def _admin_rules():
  return [rule for rule in flask_app.url_map.iter_rules() if rule.rule.startswith('/api/admin')]


def _concrete_path(rule):
  return re.sub(r'<[^>]+>', 'x', rule.rule)


def test_there_is_at_least_one_admin_route():
  assert _admin_rules(), 'expected /api/admin routes to be registered'


def test_every_admin_route_belongs_to_the_guarded_blueprint():
  # a route registered straight on `app` under /api/admin would bypass the guard
  for rule in _admin_rules():
    assert rule.endpoint.startswith('admin.'), f'{rule.rule} is not on the admin blueprint'
  assert flask_app.before_request_funcs.get('admin'), 'admin blueprint has no before_request guard'


def test_every_admin_route_rejects_unauthenticated_and_non_admin_requests(client, register_token):
  non_admin = register_token(_claims(**{'cognito:groups': ['users']}))
  for rule in _admin_rules():
    path = _concrete_path(rule)
    for method in rule.methods - {'HEAD', 'OPTIONS'}:
      anon = client.open(path, method=method)
      assert anon.status_code == 401, f'{method} {path} not protected against anonymous access'
      _assert_no_store(anon)

      forbidden = client.open(path, method=method, headers=non_admin)
      assert forbidden.status_code == 403, f'{method} {path} not protected against non-admins'
      _assert_no_store(forbidden)


# --- existing behavior is untouched --------------------------------------


def test_non_admin_routes_are_unaffected_by_the_guard(client):
  response = client.get('/health')
  assert response.status_code == 200
  assert response.headers.get('Cache-Control') != 'no-store'
