import functools

from flask import Blueprint, request

from api.auth import requires_user
from application import planning
from application.planning import PlanningError
from application.start_workout_from_plan import StartWorkoutFromPlan


def _planning_errors(view):
  @functools.wraps(view)
  def wrapper(*args, **kwargs):
    try:
      return view(*args, **kwargs)
    except PlanningError as e:
      return e.codes, e.status
  return wrapper


def register_planning_routes(app, cognito_jwt_token):
  bp = Blueprint('planning', __name__)
  user_required = requires_user(cognito_jwt_token)

  def body():
    return request.get_json(silent=True) or {}

  @bp.after_request
  def no_store(response):
    response.headers['Cache-Control'] = 'no-store'
    return response

  # The user always comes from the verified token; no route reads a user id from the request.
  @bp.route('/api/plan', methods=['GET'])
  @user_required
  def data_plan(user):
    return {'plan': planning.get_plan(user['uuid'])}, 200

  @bp.route('/api/plan', methods=['POST'])
  @user_required
  @_planning_errors
  def data_create_plan(user):
    return {'plan': planning.create_plan(user['uuid'], body().get('name'))}, 201

  @bp.route('/api/plan', methods=['PATCH'])
  @user_required
  @_planning_errors
  def data_rename_plan(user):
    return {'plan': planning.rename_plan(user['uuid'], body().get('name'))}, 200

  @bp.route('/api/plan', methods=['DELETE'])
  @user_required
  @_planning_errors
  def data_delete_plan(user):
    planning.delete_plan(user['uuid'])
    return '', 204

  @bp.route('/api/plan/workouts', methods=['POST'])
  @user_required
  @_planning_errors
  def data_create_planned_workout(user):
    return planning.create_workout(user['uuid'], body()), 201

  @bp.route('/api/plan/workouts/<string:workout_id>', methods=['PATCH'])
  @user_required
  @_planning_errors
  def data_update_planned_workout(user, workout_id):
    return planning.update_workout(user['uuid'], workout_id, body()), 200

  @bp.route('/api/plan/workouts/<string:workout_id>', methods=['DELETE'])
  @user_required
  @_planning_errors
  def data_delete_planned_workout(user, workout_id):
    planning.delete_workout(user['uuid'], workout_id)
    return '', 204

  @bp.route('/api/plan/workouts/<string:workout_id>/exercises', methods=['PUT'])
  @user_required
  @_planning_errors
  def data_replace_planned_exercises(user, workout_id):
    return planning.replace_exercises(user['uuid'], workout_id, body()), 200

  @bp.route('/api/plan/workouts/<string:workout_id>/duplicate', methods=['POST'])
  @user_required
  @_planning_errors
  def data_duplicate_planned_workout(user, workout_id):
    return planning.duplicate_workout(user['uuid'], workout_id, body()), 201

  @bp.route('/api/plan/workouts/<string:workout_id>/start', methods=['POST'])
  @user_required
  @_planning_errors
  def data_start_planned_workout(user, workout_id):
    session, created = StartWorkoutFromPlan.run(user['uuid'], workout_id, body().get('started_at'))
    return session, 201 if created else 200

  app.register_blueprint(bp)
