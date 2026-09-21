from flask import Blueprint, g, request

from lib.auth import resolve_admin, AuthError, ForbiddenError
from admin.overview import build_overview


def register_admin_routes(app, cognito_jwt_token):
  admin = Blueprint('admin', __name__, url_prefix='/api/admin')

  # The only place admin auth happens: every route on this blueprint is covered, so routes never check it.
  @admin.before_request
  def require_admin():
    if request.method == 'OPTIONS':
      return None
    try:
      g.admin = resolve_admin(request.headers, cognito_jwt_token)
    except AuthError as e:
      return {'errors': [str(e)]}, 401
    except ForbiddenError as e:
      return {'errors': [str(e)]}, 403
    return None

  @admin.after_request
  def no_store(response):
    response.headers['Cache-Control'] = 'no-store'
    return response

  @admin.route('/me', methods=['GET'])
  def data_admin_me():
    return g.admin, 200

  @admin.route('/overview', methods=['GET'])
  def data_admin_overview():
    return build_overview(), 200

  app.register_blueprint(admin)
