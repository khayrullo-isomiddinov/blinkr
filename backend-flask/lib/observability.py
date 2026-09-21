import os

import rollbar
import rollbar.contrib.flask
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware
from flask import got_request_exception
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor


def init_observability(app):
  # Honeycomb (OpenTelemetry), X-Ray and Rollbar; the console exporter also prints spans to stdout.
  provider = TracerProvider()
  provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
  provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
  trace.set_tracer_provider(provider)

  xray_recorder.configure(service='backend-flask', dynamic_naming=os.getenv('AWS_XRAY_URL'))
  XRayMiddleware(app, xray_recorder)

  FlaskInstrumentor().instrument_app(app)
  RequestsInstrumentor().instrument()

  rollbar.init(
    os.getenv('ROLLBAR_ACCESS_TOKEN'),
    'production',
    root=os.path.dirname(os.path.dirname(os.path.realpath(__file__))),
    allow_logging_basic_config=False
  )
  got_request_exception.connect(rollbar.contrib.flask.report_exception, app)
