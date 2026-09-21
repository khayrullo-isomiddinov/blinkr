import uuid

import psycopg2
from flask import Blueprint, request

from api.auth import requires_user
from repositories.create_workout_session import CreateWorkoutSession
from repositories.show_workout_session import ShowWorkoutSession
from repositories.workout_sessions import WorkoutSessions
from repositories.create_session_exercise import CreateSessionExercise
from repositories.session_exercises import SessionExercises
from repositories.create_set import CreateSet
from repositories.sets import Sets
from application.complete_workout_session import CompleteWorkoutSessionAndRecordEvent

SESSION_NOT_FOUND = {'errors': ['workout_session_not_found']}
SESSION_EXERCISE_NOT_FOUND = {'errors': ['session_exercise_not_found']}


def _is_uuid(value):
  try:
    uuid.UUID(value)
  except ValueError:
    return False
  return True


def register_workout_session_routes(app, cognito_jwt_token):
  bp = Blueprint('workout_sessions', __name__)
  user_required = requires_user(cognito_jwt_token)

  def _owned_session_exercise(session_id, session_exercise_id, user):
    # -> (error_response, session); exactly one is None
    if not _is_uuid(session_id):
      return (SESSION_NOT_FOUND, 404), None
    if not _is_uuid(session_exercise_id):
      return (SESSION_EXERCISE_NOT_FOUND, 404), None
    session = ShowWorkoutSession.run(session_id, user['uuid'])
    if session is None:
      return (SESSION_NOT_FOUND, 404), None
    if not any(se['id'] == session_exercise_id for se in session['session_exercises']):
      return (SESSION_EXERCISE_NOT_FOUND, 404), None
    return None, session

  @bp.route('/api/workout-sessions', methods=['GET'])
  @user_required
  def data_workout_sessions(user):
    # Optional ?from=&to= (ISO timestamps): sessions that began in [from, to). The calendar asks for one local week.
    try:
      return WorkoutSessions.run(user['uuid'], request.args.get('from'), request.args.get('to')), 200
    except psycopg2.errors.DataError:
      return ['range_invalid'], 422

  @bp.route('/api/workout-sessions/<string:session_id>', methods=['GET'])
  @user_required
  def data_show_workout_session(user, session_id):
    if not _is_uuid(session_id):
      return SESSION_NOT_FOUND, 404

    session = ShowWorkoutSession.run(session_id, user['uuid'])
    if session is None:
      return SESSION_NOT_FOUND, 404
    return session, 200

  @bp.route('/api/workout-sessions', methods=['POST'])
  @user_required
  def data_create_workout_session(user):
    body = request.get_json(silent=True) or {}
    started_at = body.get('started_at')
    notes = body.get('notes')

    errors = []
    if not started_at:
      errors.append('started_at_blank')
    elif not isinstance(started_at, str):
      errors.append('started_at_invalid')
    if errors:
      return errors, 422

    try:
      session = CreateWorkoutSession.run(user['uuid'], started_at, notes)
    except psycopg2.errors.DataError:
      return ['started_at_invalid'], 422

    return session, 201

  @bp.route('/api/workout-sessions/<string:session_id>/complete', methods=['PATCH'])
  @user_required
  def data_complete_workout_session(user, session_id):
    if not _is_uuid(session_id):
      return SESSION_NOT_FOUND, 404

    # Completion and its WorkoutSessionCompleted outbox row commit together; publishing to SQS
    # happens later in the outbox worker, so an SQS outage can't fail this request.
    session = CompleteWorkoutSessionAndRecordEvent.run(session_id, user['uuid'])
    if session is None:
      return SESSION_NOT_FOUND, 404
    return session, 200

  @bp.route('/api/workout-sessions/<string:session_id>/exercises', methods=['GET'])
  @user_required
  def data_session_exercises(user, session_id):
    if not _is_uuid(session_id):
      return SESSION_NOT_FOUND, 404

    if ShowWorkoutSession.run(session_id, user['uuid']) is None:
      return SESSION_NOT_FOUND, 404

    return SessionExercises.run(session_id), 200

  @bp.route('/api/workout-sessions/<string:session_id>/exercises', methods=['POST'])
  @user_required
  def data_create_session_exercise(user, session_id):
    if not _is_uuid(session_id):
      return SESSION_NOT_FOUND, 404

    if ShowWorkoutSession.run(session_id, user['uuid']) is None:
      return SESSION_NOT_FOUND, 404

    body = request.get_json(silent=True) or {}
    exercise_id = body.get('exercise_id')
    exercise_order = body.get('exercise_order')
    notes = body.get('notes')

    errors = []
    if not exercise_id:
      errors.append('exercise_id_blank')
    elif not isinstance(exercise_id, str):
      errors.append('exercise_id_invalid')
    if exercise_order is None:
      errors.append('exercise_order_blank')
    elif not isinstance(exercise_order, int) or isinstance(exercise_order, bool):
      errors.append('exercise_order_invalid')
    if errors:
      return errors, 422

    try:
      session_exercise = CreateSessionExercise.run(session_id, exercise_id, exercise_order, notes)
    except psycopg2.errors.ForeignKeyViolation:
      return ['exercise_not_found'], 404
    except psycopg2.errors.UniqueViolation:
      return ['exercise_order_taken'], 409
    except psycopg2.errors.DataError:
      return ['exercise_id_invalid'], 422
    except psycopg2.errors.CheckViolation:
      return ['exercise_order_invalid'], 422

    return session_exercise, 201

  @bp.route('/api/workout-sessions/<string:session_id>/exercises/<string:session_exercise_id>/sets', methods=['GET'])
  @user_required
  def data_sets(user, session_id, session_exercise_id):
    error, _ = _owned_session_exercise(session_id, session_exercise_id, user)
    if error:
      return error

    return Sets.run(session_exercise_id), 200

  @bp.route('/api/workout-sessions/<string:session_id>/exercises/<string:session_exercise_id>/sets', methods=['POST'])
  @user_required
  def data_create_set(user, session_id, session_exercise_id):
    error, _ = _owned_session_exercise(session_id, session_exercise_id, user)
    if error:
      return error

    body = request.get_json(silent=True) or {}
    reps = body.get('reps')
    weight = body.get('weight')
    weight_unit = body.get('weight_unit')
    set_order = body.get('set_order')
    set_type = body.get('set_type')

    errors = []
    if reps is None:
      errors.append('reps_blank')
    elif isinstance(reps, bool) or not isinstance(reps, int):
      errors.append('reps_invalid')

    if set_order is None:
      errors.append('set_order_blank')
    elif isinstance(set_order, bool) or not isinstance(set_order, int):
      errors.append('set_order_invalid')

    if weight is not None and (isinstance(weight, bool) or not isinstance(weight, (int, float))):
      errors.append('weight_invalid')

    if weight_unit is not None and not isinstance(weight_unit, str):
      errors.append('weight_unit_invalid')

    if set_type is not None and not isinstance(set_type, str):
      errors.append('set_type_invalid')

    if errors:
      return errors, 422

    if set_type is None:
      set_type = 'working'

    try:
      created_set = CreateSet.run(session_exercise_id, set_order, reps, weight, weight_unit, set_type)
    except psycopg2.errors.UniqueViolation:
      return ['set_order_taken'], 409
    except psycopg2.errors.CheckViolation:
      return ['set_invalid'], 422
    except psycopg2.errors.DataError:
      return ['set_invalid'], 422

    return created_set, 201

  app.register_blueprint(bp)
