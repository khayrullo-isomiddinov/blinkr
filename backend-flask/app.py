from flask import Flask, request
from flask_cors import CORS
import os
import uuid
import psycopg2

# HoneyComb ---------
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

# X-RAY ----------
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware

# CloudWatch Logs ----------
import logging
import watchtower

# Rollbar ----------
import rollbar
import rollbar.contrib.flask
from flask import got_request_exception

# Cognito JWT ----------
from lib.cognito_jwt_token import CognitoJwtToken
from lib.auth import resolve_current_user, AuthError
from admin.routes import register_admin_routes

from repositories.create_exercise import CreateExercise
from repositories.show_exercise import ShowExercise
from repositories.exercises import Exercises
from repositories.create_workout_session import CreateWorkoutSession
from repositories.show_workout_session import ShowWorkoutSession
from repositories.workout_sessions import WorkoutSessions
from repositories.create_session_exercise import CreateSessionExercise
from repositories.session_exercises import SessionExercises
from repositories.create_set import CreateSet
from repositories.sets import Sets

from events.publisher_factory import build_event_publisher
from application.complete_workout_session import CompleteWorkoutSessionAndRecordEvent

# CloudWatch Logs ----------
LOGGER = logging.getLogger(__name__)
LOGGER.setLevel(logging.DEBUG)
console_handler = logging.StreamHandler()
cw_handler = watchtower.CloudWatchLogHandler(log_group='backend-flask')
LOGGER.addHandler(console_handler)
LOGGER.addHandler(cw_handler)

# HoneyComb ---------
# Initialize tracing and an exporter that can send data to Honeycomb
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter())
provider.add_span_processor(processor)

# X-RAY ----------
xray_url = os.getenv("AWS_XRAY_URL")
xray_recorder.configure(service='backend-flask', dynamic_naming=xray_url)

# Show this in the logs within the backend-flask app (STDOUT)
simple_processor = SimpleSpanProcessor(ConsoleSpanExporter())
provider.add_span_processor(simple_processor)

trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

app = Flask(__name__)

# X-RAY ----------
XRayMiddleware(app, xray_recorder)

# HoneyComb ---------
# Initialize automatic instrumentation with Flask
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

# Rollbar ----------
rollbar_access_token = os.getenv('ROLLBAR_ACCESS_TOKEN')
rollbar.init(
  rollbar_access_token,
  # environment name (using 'production' for this stage, even though this is dev/local)
  'production',
  # server root directory, makes tracebacks prettier
  root=os.path.dirname(os.path.realpath(__file__)),
  # flask already sets up logging
  allow_logging_basic_config=False
)
# send exceptions from `app` to rollbar, using flask's signal system.
got_request_exception.connect(rollbar.contrib.flask.report_exception, app)


frontend = os.getenv('FRONTEND_URL')
backend = os.getenv('BACKEND_URL')
origins = [frontend, backend]
# Local dev only: "localhost" and "127.0.0.1" are different CORS origins even
# though they're the same machine, so a browser pointed at whichever one
# FRONTEND_URL/BACKEND_URL *don't* use would otherwise have every GET request
# silently blocked. Only added when running against local URLs -- production
# origins are left exactly as configured.
for url in (frontend, backend):
  if url and '127.0.0.1' in url:
    origins.append(url.replace('127.0.0.1', 'localhost'))
  elif url and 'localhost' in url:
    origins.append(url.replace('localhost', '127.0.0.1'))
cors = CORS(
  app,
  resources={r"/api/*": {"origins": origins}},
  expose_headers="location,link,Authorization",
  allow_headers=["content-type", "if-modified-since", "Authorization"],
  methods="OPTIONS,GET,HEAD,POST,PATCH,DELETE"
)

# Cognito JWT ----------
cognito_jwt_token = CognitoJwtToken(
  user_pool_id=os.getenv("AWS_COGNITO_USER_POOL_ID"),
  user_pool_client_id=os.getenv("AWS_COGNITO_USER_POOL_CLIENT_ID"),
  region=os.getenv("AWS_DEFAULT_REGION")
)

# Admin ----------
register_admin_routes(app, cognito_jwt_token)

# Events ----------
event_publisher = build_event_publisher()


@app.route("/health", methods=['GET'])
def health():
  return {"status": "ok"}, 200

@app.route("/api/exercises", methods=['GET'])
def data_exercises():
  return Exercises.run(), 200

@app.route("/api/exercises/<string:exercise_id>", methods=['GET'])
def data_show_exercise(exercise_id):
  try:
    uuid.UUID(exercise_id)
  except ValueError:
    return {'errors': ['exercise_not_found']}, 404

  exercise = ShowExercise.run(exercise_id)
  if exercise is None:
    return {'errors': ['exercise_not_found']}, 404
  return exercise, 200

@app.route("/api/exercises", methods=['POST', 'OPTIONS'])
def data_create_exercise():
  body = request.get_json(silent=True) or {}
  name = body.get('name')
  muscle_group = body.get('muscle_group')
  equipment = body.get('equipment')

  errors = []
  if not name:
    errors.append('name_blank')
  if not muscle_group:
    errors.append('muscle_group_blank')
  if errors:
    return errors, 422

  try:
    exercise = CreateExercise.run(name, muscle_group, equipment)
  except psycopg2.errors.UniqueViolation:
    return ['exercise_name_taken'], 409

  return exercise, 201

@app.route("/api/workout-sessions", methods=['GET'])
def data_workout_sessions():
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401

  return WorkoutSessions.run(user['uuid']), 200

@app.route("/api/workout-sessions/<string:session_id>", methods=['GET'])
def data_show_workout_session(session_id):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401

  try:
    uuid.UUID(session_id)
  except ValueError:
    return {'errors': ['workout_session_not_found']}, 404

  session = ShowWorkoutSession.run(session_id, user['uuid'])
  if session is None:
    return {'errors': ['workout_session_not_found']}, 404
  return session, 200

@app.route("/api/workout-sessions", methods=['POST', 'OPTIONS'])
def data_create_workout_session():
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401

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

@app.route("/api/workout-sessions/<string:session_id>/complete", methods=['PATCH', 'OPTIONS'])
def data_complete_workout_session(session_id):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401

  try:
    uuid.UUID(session_id)
  except ValueError:
    return {'errors': ['workout_session_not_found']}, 404

  # Completion + recording the WorkoutSessionCompleted event happen in one
  # DB transaction (see CompleteWorkoutSessionAndRecordEvent). Publishing to
  # SQS is no longer synchronous with this request at all -- it's handled
  # later, out of band, by OutboxPublisher -- so an SQS outage can no
  # longer turn a successfully committed completion into an error response.
  session = CompleteWorkoutSessionAndRecordEvent.run(session_id, user['uuid'])
  if session is None:
    return {'errors': ['workout_session_not_found']}, 404
  return session, 200

@app.route("/api/workout-sessions/<string:session_id>/exercises", methods=['GET'])
def data_session_exercises(session_id):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401

  try:
    uuid.UUID(session_id)
  except ValueError:
    return {'errors': ['workout_session_not_found']}, 404

  if ShowWorkoutSession.run(session_id, user['uuid']) is None:
    return {'errors': ['workout_session_not_found']}, 404

  return SessionExercises.run(session_id), 200

@app.route("/api/workout-sessions/<string:session_id>/exercises", methods=['POST', 'OPTIONS'])
def data_create_session_exercise(session_id):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401

  try:
    uuid.UUID(session_id)
  except ValueError:
    return {'errors': ['workout_session_not_found']}, 404

  if ShowWorkoutSession.run(session_id, user['uuid']) is None:
    return {'errors': ['workout_session_not_found']}, 404

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

@app.route("/api/workout-sessions/<string:session_id>/exercises/<string:session_exercise_id>/sets", methods=['GET'])
def data_sets(session_id, session_exercise_id):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401

  try:
    uuid.UUID(session_id)
  except ValueError:
    return {'errors': ['workout_session_not_found']}, 404

  try:
    uuid.UUID(session_exercise_id)
  except ValueError:
    return {'errors': ['session_exercise_not_found']}, 404

  session = ShowWorkoutSession.run(session_id, user['uuid'])
  if session is None:
    return {'errors': ['workout_session_not_found']}, 404

  if not any(se['id'] == session_exercise_id for se in session['session_exercises']):
    return {'errors': ['session_exercise_not_found']}, 404

  return Sets.run(session_exercise_id), 200

@app.route(
  "/api/workout-sessions/<string:session_id>/exercises/<string:session_exercise_id>/sets",
  methods=['POST', 'OPTIONS']
)
def data_create_set(session_id, session_exercise_id):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401

  try:
    uuid.UUID(session_id)
  except ValueError:
    return {'errors': ['workout_session_not_found']}, 404

  try:
    uuid.UUID(session_exercise_id)
  except ValueError:
    return {'errors': ['session_exercise_not_found']}, 404

  session = ShowWorkoutSession.run(session_id, user['uuid'])
  if session is None:
    return {'errors': ['workout_session_not_found']}, 404

  if not any(se['id'] == session_exercise_id for se in session['session_exercises']):
    return {'errors': ['session_exercise_not_found']}, 404

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

if __name__ == "__main__":
  app.run(debug=True)
