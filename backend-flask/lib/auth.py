from lib.cognito_jwt_token import CognitoJwtToken, TokenVerifyError
from lib.db import query_array_json


class AuthError(Exception):
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
  if not rows:
    raise AuthError('user_not_provisioned')
  return rows[0]


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
