import time
import json
import urllib.request

from jose import jwk, jwt
from jose.utils import base64url_decode


class FlaskAWSCognitoError(Exception):
  pass


class TokenVerifyError(Exception):
  pass


class CognitoJwtToken:
  def __init__(self, user_pool_id, user_pool_client_id, region, request_client=None):
    self.region = region
    if not self.region:
      raise FlaskAWSCognitoError('No AWS region provided')
    self.user_pool_id = user_pool_id
    self.user_pool_client_id = user_pool_client_id
    self.request_client = request_client if request_client is not None else urllib.request
    self._load_jwk_keys()

  def _load_jwk_keys(self):
    keys_url = f'https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json'
    try:
      with self.request_client.urlopen(keys_url) as response:
        body = response.read()
    except Exception as e:
      raise FlaskAWSCognitoError(f'Unable to fetch JWKS: {e}') from e
    self.jwk_keys = json.loads(body.decode('utf-8'))['keys']

  @staticmethod
  def extract_access_token(request_headers):
    auth_header = request_headers.get('Authorization')
    if not auth_header:
      return None
    parts = auth_header.split(' ')
    if len(parts) != 2 or parts[0] != 'Bearer':
      return None
    return parts[1]

  def _find_jwk_key(self, kid):
    for key in self.jwk_keys:
      if key['kid'] == kid:
        return key
    raise TokenVerifyError('Public key not found in JWKS for this token')

  def verify(self, token):
    try:
      headers = jwt.get_unverified_headers(token)
    except Exception as e:
      raise TokenVerifyError(f'Malformed token: {e}') from e

    jwk_key = self._find_jwk_key(headers.get('kid'))
    public_key = jwk.construct(jwk_key)

    message, encoded_signature = token.rsplit('.', 1)
    decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))

    if not public_key.verify(message.encode('utf-8'), decoded_signature):
      raise TokenVerifyError('Signature verification failed')

    claims = jwt.get_unverified_claims(token)

    if time.time() > claims.get('exp', 0):
      raise TokenVerifyError('Token is expired')

    # Cognito access tokens carry the audience in `client_id`, not `aud`.
    if claims.get('client_id') != self.user_pool_client_id:
      raise TokenVerifyError('Token was not issued for this audience')

    return claims
