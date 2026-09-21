import time
import uuid

from lib.cognito_jwt_token import CognitoJwtToken, TokenVerifyError
from lib.db import query_array_json, transaction

ADMIN_GROUP = 'admin'


class AuthError(Exception):
  pass


# Not an AuthError subclass on purpose: 401 (who are you) vs 403 (not allowed) must be handled separately.
class ForbiddenError(Exception):
  pass


def resolve_current_user(request_headers, cognito_jwt_token):
  """
  Extracts and verifies the bearer token, then resolves the verified Cognito
  username claim to a row in public.users. Raises AuthError on any failure.
  """
  access_token = CognitoJwtToken.extract_access_token(request_headers)
  if not access_token:
    raise AuthError('missing_bearer_token')

  try:
    claims = cognito_jwt_token.verify(access_token)
  except TokenVerifyError as e:
    raise AuthError(f'invalid_token: {e}') from e

  cognito_user_id = claims['username']
  rows = query_array_json(
    "SELECT uuid, handle, display_name FROM public.users WHERE cognito_user_id = %s",
    (cognito_user_id,)
  )
  if rows:
    return rows[0]
  return _provision_user(cognito_user_id)


def _provision_user(cognito_user_id):
  # Cognito owns the account; the app row is created the first time a verified user shows up.
  with transaction() as conn:
    # serializes concurrent first requests for the same user so only one row is inserted
    query_array_json("SELECT pg_advisory_xact_lock(hashtext(%s))", (cognito_user_id,), conn=conn)
    existing = query_array_json(
      "SELECT uuid, handle, display_name FROM public.users WHERE cognito_user_id = %s",
      (cognito_user_id,), conn=conn
    )
    if existing:
      return existing[0]

    for handle in (cognito_user_id, f'{cognito_user_id}-{uuid.uuid4().hex[:6]}'):
      created = query_array_json(
        "INSERT INTO public.users (display_name, handle, cognito_user_id) VALUES (%s, %s, %s) "
        "ON CONFLICT (handle) DO NOTHING RETURNING uuid, handle, display_name",
        (cognito_user_id, handle, cognito_user_id), conn=conn
      )
      if created:
        return created[0]
  raise AuthError('user_not_provisioned')


def resolve_admin(request_headers, cognito_jwt_token):
  """
  Authorizes an admin from the verified access-token claims alone (no
  public.users lookup). Raises AuthError (-> 401) if there's no valid
  access token, ForbiddenError (-> 403) if the token is valid but the
  caller isn't in the `admin` Cognito group. Fails closed on anything
  missing or unexpected.
  """
  access_token = CognitoJwtToken.extract_access_token(request_headers)
  if not access_token:
    raise AuthError('missing_bearer_token')

  try:
    claims = cognito_jwt_token.verify(access_token)
  except TokenVerifyError as e:
    raise AuthError(f'invalid_token: {e}') from e
  except Exception as e:
    # verification is local (JWKS loaded at startup), so anything else means an unparseable token
    raise AuthError('invalid_token') from e

  if claims.get('token_use') != 'access':
    raise AuthError('invalid_token_use')

  username = claims.get('username')
  if not isinstance(username, str) or not username:
    raise AuthError('invalid_token')

  # verify() rejects expired tokens; re-checked because a missing/garbled exp must not get through.
  expires_at = claims.get('exp')
  if isinstance(expires_at, bool) or not isinstance(expires_at, (int, float)) or expires_at <= time.time():
    raise AuthError('token_expired')

  # Must be a real list: `'admin' in 'administrators'` is true for a string.
  groups = claims.get('cognito:groups')
  if not isinstance(groups, list) or ADMIN_GROUP not in groups:
    raise ForbiddenError('admin_required')

  return {'username': username, 'groups': groups, 'expires_at': int(expires_at)}


def resolve_optional_user(request_headers, cognito_jwt_token):
  """
  Same as resolve_current_user but returns None instead of raising when no
  valid session is present -- used by routes that behave differently for
  signed-in users but don't require auth.
  """
  try:
    return resolve_current_user(request_headers, cognito_jwt_token)
  except AuthError:
    return None
