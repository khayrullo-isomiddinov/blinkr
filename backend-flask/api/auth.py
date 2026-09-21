import functools

from flask import request

from lib.auth import resolve_current_user, AuthError


def requires_user(cognito_jwt_token):
  # Resolves the signed-in user and passes it as the view's first argument; 401 otherwise.
  def decorator(view):
    @functools.wraps(view)
    def wrapper(*args, **kwargs):
      try:
        user = resolve_current_user(request.headers, cognito_jwt_token)
      except AuthError as e:
        return {'errors': [str(e)]}, 401
      return view(user, *args, **kwargs)
    return wrapper
  return decorator
