import pytest

from lib.auth import resolve_current_user, resolve_optional_user, AuthError
from lib.cognito_jwt_token import TokenVerifyError


class FakeHeaders(dict):
  def get(self, key, default=None):
    return dict.get(self, key, default)


class FakeCognitoJwtToken:
  def __init__(self, claims=None, raise_error=None):
    self._claims = claims
    self._raise_error = raise_error

  def verify(self, token):
    if self._raise_error:
      raise self._raise_error
    return self._claims


def test_missing_bearer_token_raises():
  with pytest.raises(AuthError):
    resolve_current_user(FakeHeaders(), FakeCognitoJwtToken(claims={'username': 'whoever'}))


def test_invalid_token_raises():
  headers = FakeHeaders({'Authorization': 'Bearer bad-token'})
  fake_token = FakeCognitoJwtToken(raise_error=TokenVerifyError('signature mismatch'))
  with pytest.raises(AuthError):
    resolve_current_user(headers, fake_token)


def test_first_sign_in_creates_the_user_row_once(db_available):
  from lib.db import execute, query_array_json
  cognito_id = 'first-sign-in-test-user'
  headers = FakeHeaders({'Authorization': 'Bearer good-token'})
  fake_token = FakeCognitoJwtToken(claims={'username': cognito_id})
  try:
    first = resolve_current_user(headers, fake_token)
    second = resolve_current_user(headers, fake_token)
    assert first['uuid'] == second['uuid']
    assert first['handle'] == cognito_id
    assert len(query_array_json("SELECT 1 FROM public.users WHERE cognito_user_id = %s", (cognito_id,))) == 1
  finally:
    execute("DELETE FROM public.users WHERE cognito_user_id = %s", (cognito_id,))


def test_resolve_optional_user_returns_none_instead_of_raising():
  assert resolve_optional_user(FakeHeaders(), FakeCognitoJwtToken(claims={'username': 'whoever'})) is None
