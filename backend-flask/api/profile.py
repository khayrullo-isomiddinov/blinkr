import base64
import binascii
import re

from flask import Blueprint, request

from api.auth import requires_user
from repositories.user_profile import UserProfile
from repositories.update_user_display_name import UpdateUserDisplayName
from repositories.set_user_avatar import SetUserAvatar
from repositories.clear_user_avatar import ClearUserAvatar
from repositories.delete_user_account import DeleteUserAccount

MAX_AVATAR_BYTES = 256 * 1024
MAX_DISPLAY_NAME = 50
DATA_URL = re.compile(r'^data:image/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$')


def _sniff_image_type(data):
  # Trust the bytes, not what the client claims.
  if data.startswith(b'\xff\xd8\xff'):
    return 'image/jpeg'
  if data.startswith(b'\x89PNG\r\n\x1a\n'):
    return 'image/png'
  if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
    return 'image/webp'
  return None


def _profile_json(row):
  avatar = None
  if row['avatar']:
    encoded = base64.b64encode(bytes(row['avatar'])).decode('ascii')
    avatar = f"data:{row['avatar_content_type']};base64,{encoded}"
  updated = row['avatar_updated_at']
  return {
    'handle': row['handle'],
    'display_name': row['display_name'],
    'avatar': avatar,
    'avatar_updated_at': updated.isoformat() if updated else None,
  }


def register_profile_routes(app, cognito_jwt_token):
  bp = Blueprint('profile', __name__)
  user_required = requires_user(cognito_jwt_token)

  @bp.after_request
  def no_store(response):
    response.headers['Cache-Control'] = 'no-store'
    return response

  @bp.route('/api/me', methods=['GET'])
  @user_required
  def data_profile(user):
    return _profile_json(UserProfile.run(user['uuid'])), 200

  @bp.route('/api/me', methods=['PATCH'])
  @user_required
  def data_update_profile(user):
    body = request.get_json(silent=True) or {}
    display_name = body.get('display_name')
    if not isinstance(display_name, str) or not display_name.strip() or len(display_name.strip()) > MAX_DISPLAY_NAME:
      return ['display_name_invalid'], 422

    UpdateUserDisplayName.run(user['uuid'], display_name.strip())
    return _profile_json(UserProfile.run(user['uuid'])), 200

  @bp.route('/api/me/avatar', methods=['PUT'])
  @user_required
  def data_set_avatar(user):
    body = request.get_json(silent=True) or {}
    image = body.get('image')
    match = DATA_URL.match(image) if isinstance(image, str) else None
    if not match:
      return ['avatar_invalid'], 422

    try:
      data = base64.b64decode(match.group(1), validate=True)
    except (binascii.Error, ValueError):
      return ['avatar_invalid'], 422

    if not data or len(data) > MAX_AVATAR_BYTES:
      return ['avatar_too_large' if data else 'avatar_invalid'], 422

    content_type = _sniff_image_type(data)
    if content_type is None:
      return ['avatar_invalid'], 422

    SetUserAvatar.run(user['uuid'], data, content_type)
    return _profile_json(UserProfile.run(user['uuid'])), 200

  @bp.route('/api/me/avatar', methods=['DELETE'])
  @user_required
  def data_clear_avatar(user):
    ClearUserAvatar.run(user['uuid'])
    return _profile_json(UserProfile.run(user['uuid'])), 200

  @bp.route('/api/me', methods=['DELETE'])
  @user_required
  def data_delete_account(user):
    DeleteUserAccount.run(user['uuid'])
    return '', 204

  app.register_blueprint(bp)
