import os

from flask import Flask
from flask_cors import CORS

from lib.cognito_jwt_token import CognitoJwtToken
from lib.observability import init_observability
from admin.routes import register_admin_routes
from api.exercises import register_exercise_routes
from api.workout_sessions import register_workout_session_routes
from api.profile import register_profile_routes
from api.planning import register_planning_routes

app = Flask(__name__)
# Room for a base64 profile picture (capped again in api/profile.py) and nothing much larger.
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024
init_observability(app)

frontend = os.getenv('FRONTEND_URL')
backend = os.getenv('BACKEND_URL')
origins = [frontend, backend]
# Local dev: "localhost" and "127.0.0.1" are different CORS origins, so allow whichever of the two the configured URL isn't.
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
  methods="OPTIONS,GET,HEAD,POST,PUT,PATCH,DELETE"
)

cognito_jwt_token = CognitoJwtToken(
  user_pool_id=os.getenv("AWS_COGNITO_USER_POOL_ID"),
  user_pool_client_id=os.getenv("AWS_COGNITO_USER_POOL_CLIENT_ID"),
  region=os.getenv("AWS_DEFAULT_REGION")
)

register_admin_routes(app, cognito_jwt_token)
register_exercise_routes(app)
register_workout_session_routes(app, cognito_jwt_token)
register_profile_routes(app, cognito_jwt_token)
register_planning_routes(app, cognito_jwt_token)


@app.route("/health", methods=['GET'])
def health():
  return {"status": "ok"}, 200


if __name__ == "__main__":
  app.run(debug=True)
