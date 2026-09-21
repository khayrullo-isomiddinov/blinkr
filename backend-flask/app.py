from flask import Flask
from flask import request
from flask_cors import CORS
import os

from services.teams import Teams
from services.show_team import ShowTeam
from services.follow_team import FollowTeam
from services.unfollow_team import UnfollowTeam
from services.matches import Matches
from services.show_match import ShowMatch
from services.create_match import CreateMatch
from services.match_events import MatchEvents
from services.create_match_event import CreateMatchEvent
from services.match_reactions import MatchReactions
from services.create_match_reaction import CreateMatchReaction
from services.follow_match import FollowMatch
from services.unfollow_match import UnfollowMatch

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
from lib.auth import resolve_current_user, resolve_optional_user, AuthError

# CloudWatch Logs ----------
LOGGER = logging.getLogger(__name__)
LOGGER.setLevel(logging.DEBUG)
console_handler = logging.StreamHandler()
cw_handler = watchtower.CloudWatchLogHandler(log_group='backend-flask')
LOGGER.addHandler(console_handler)
LOGGER.addHandler(cw_handler)
LOGGER.info("test log")

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
# origins (e.g. https://blinkr.fit) are left exactly as configured.
for url in (frontend, backend):
  if url and '127.0.0.1' in url:
    origins.append(url.replace('127.0.0.1', 'localhost'))
  elif url and 'localhost' in url:
    origins.append(url.replace('localhost', '127.0.0.1'))
cors = CORS(
  app,
  resources={r"/api/*": {"origins": origins}},
  expose_headers="location,link,Authorization",
  allow_headers="content-type,if-modified-since,Authorization",
  methods="OPTIONS,GET,HEAD,POST,DELETE"
)

# Cognito JWT ----------
cognito_jwt_token = CognitoJwtToken(
  user_pool_id=os.getenv("AWS_COGNITO_USER_POOL_ID"),
  user_pool_client_id=os.getenv("AWS_COGNITO_USER_POOL_CLIENT_ID"),
  region=os.getenv("AWS_DEFAULT_REGION")
)


@app.route("/api/teams", methods=['GET'])
def data_teams():
  followed_only = request.args.get('followed') == 'true'
  if followed_only:
    user = resolve_optional_user(request.headers, cognito_jwt_token)
    if not user:
      return [], 200
    return Teams.run(followed_by_user_uuid=user['uuid']), 200
  return Teams.run(), 200

@app.route("/api/teams/<string:team_uuid>", methods=['GET'])
def data_show_team(team_uuid):
  data = ShowTeam.run(team_uuid)
  if data is None:
    return {'errors': ['team_not_found']}, 404
  return data, 200

@app.route("/api/teams/<string:team_uuid>/follow", methods=['POST', 'OPTIONS'])
def data_follow_team(team_uuid):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401
  result = FollowTeam.run(user['uuid'], team_uuid)
  if result is None:
    return {'errors': ['team_not_found']}, 404
  return result, 200

@app.route("/api/teams/<string:team_uuid>/follow", methods=['DELETE', 'OPTIONS'])
def data_unfollow_team(team_uuid):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401
  result = UnfollowTeam.run(user['uuid'], team_uuid)
  if result is None:
    return {'errors': ['team_not_found']}, 404
  return result, 200

@app.route("/api/matches/live", methods=['GET'])
def data_matches_live():
  return Matches.run(status_filter='live'), 200

@app.route("/api/matches/upcoming", methods=['GET'])
def data_matches_upcoming():
  return Matches.run(status_filter='scheduled'), 200

@app.route("/api/matches", methods=['POST', 'OPTIONS'])
def data_create_match():
  # Admin/demo tool -- same unauthenticated posture as the events endpoint,
  # used to spin up a fixture for the event-driven demo flow (see
  # bin/demo-match-simulation).
  body = request.json or {}
  model = CreateMatch.run(
    home_team_uuid=body.get('home_team_uuid'),
    away_team_uuid=body.get('away_team_uuid'),
    competition=body.get('competition'),
    kickoff_time=body.get('kickoff_time'),
    status=body.get('status', 'scheduled'),
  )
  if model['errors'] is not None:
    status = 404 if model['errors'] == ['team_not_found'] else 422
    return model['errors'], status
  return model['data'], 200

@app.route("/api/matches", methods=['GET'])
def data_matches():
  followed_only = request.args.get('followed') == 'true'
  if followed_only:
    user = resolve_optional_user(request.headers, cognito_jwt_token)
    if not user:
      return [], 200
    return Matches.run(followed_by_user_uuid=user['uuid']), 200
  return Matches.run(), 200

@app.route("/api/matches/<string:match_uuid>", methods=['GET'])
def data_show_match(match_uuid):
  data = ShowMatch.run(match_uuid)
  if data is None:
    return {'errors': ['match_not_found']}, 404
  return data, 200

@app.route("/api/matches/<string:match_uuid>/events", methods=['GET'])
def data_match_events(match_uuid):
  return MatchEvents.run(match_uuid), 200

@app.route("/api/matches/<string:match_uuid>/events", methods=['POST', 'OPTIONS'])
def data_create_match_event(match_uuid):
  # Admin/demo tool for recording match events (goals, cards, etc). Not wired
  # into the frontend -- there's no admin-role system in this project, so this
  # is intentionally open, matching the existing unauthenticated write routes.
  body = request.json or {}
  model = CreateMatchEvent.run(
    match_uuid=match_uuid,
    event_type=body.get('event_type'),
    minute=body.get('minute'),
    team_uuid=body.get('team_uuid'),
    player_name=body.get('player_name'),
    detail=body.get('detail'),
  )
  if model['errors'] is not None:
    status = 404 if model['errors'] == ['match_not_found'] else 422
    return model['errors'], status
  return model['data'], 200

@app.route("/api/matches/<string:match_uuid>/reactions", methods=['GET'])
def data_match_reactions(match_uuid):
  return MatchReactions.run(match_uuid), 200

@app.route("/api/matches/<string:match_uuid>/reactions", methods=['POST', 'OPTIONS'])
def data_create_match_reaction(match_uuid):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401
  message = (request.json or {}).get('message')
  model = CreateMatchReaction.run(match_uuid, user['uuid'], message)
  if model['errors'] is not None:
    status = 404 if model['errors'] == ['match_not_found'] else 422
    return model['errors'], status
  return model['data'], 200

@app.route("/api/matches/<string:match_uuid>/follow", methods=['POST', 'OPTIONS'])
def data_follow_match(match_uuid):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401
  result = FollowMatch.run(user['uuid'], match_uuid)
  if result is None:
    return {'errors': ['match_not_found']}, 404
  return result, 200

@app.route("/api/matches/<string:match_uuid>/follow", methods=['DELETE', 'OPTIONS'])
def data_unfollow_match(match_uuid):
  try:
    user = resolve_current_user(request.headers, cognito_jwt_token)
  except AuthError as e:
    return {'errors': [str(e)]}, 401
  result = UnfollowMatch.run(user['uuid'], match_uuid)
  if result is None:
    return {'errors': ['match_not_found']}, 404
  return result, 200

@app.route('/api/rollbar/test')
def rollbar_test():
  return {"message": "hello world"}

if __name__ == "__main__":
  app.run(debug=True)
