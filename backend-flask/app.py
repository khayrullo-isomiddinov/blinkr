from flask import Flask
from flask_cors import CORS
import os

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
  allow_headers="content-type,if-modified-since,Authorization",
  methods="OPTIONS,GET,HEAD,POST,DELETE"
)

# Cognito JWT ----------
cognito_jwt_token = CognitoJwtToken(
  user_pool_id=os.getenv("AWS_COGNITO_USER_POOL_ID"),
  user_pool_client_id=os.getenv("AWS_COGNITO_USER_POOL_CLIENT_ID"),
  region=os.getenv("AWS_DEFAULT_REGION")
)


@app.route("/health", methods=['GET'])
def health():
  return {"status": "ok"}, 200

if __name__ == "__main__":
  app.run(debug=True)
