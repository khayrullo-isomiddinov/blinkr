import inspect

import worker
from lib.db import query_array_json
from events.publisher_factory import build_event_publisher
from events.aws_publisher import AWSEventPublisher
from events.in_memory_publisher import InMemoryEventPublisher


def test_worker_module_never_references_flask_or_the_app_module():
  # worker.py must be runnable with none of app.py's side effects (Flask,
  # Cognito JWKS fetch, X-Ray/OpenTelemetry/Rollbar/CloudWatch init) --
  # checked statically here, and demonstrated by this whole file needing
  # none of the JWKS-mocking dance the API test files require.
  source = inspect.getsource(worker)
  import_lines = [line.strip() for line in source.splitlines() if line.strip().startswith(('import ', 'from '))]
  assert not any('app' == line.split()[1] or line.startswith('from app ') for line in import_lines)
  assert not any('flask' in line.lower() for line in import_lines)


def test_build_event_publisher_uses_aws_when_queue_configured(monkeypatch):
  monkeypatch.setenv(
    'WORKOUT_EVENTS_QUEUE_URL',
    'https://sqs.eu-central-1.amazonaws.com/123456789012/blinkr-workout-events'
  )

  publisher = build_event_publisher()

  assert isinstance(publisher, AWSEventPublisher)
  assert publisher.queue_url == 'https://sqs.eu-central-1.amazonaws.com/123456789012/blinkr-workout-events'


def test_build_event_publisher_falls_back_to_in_memory_without_queue_url(monkeypatch):
  monkeypatch.delenv('WORKOUT_EVENTS_QUEUE_URL', raising=False)

  publisher = build_event_publisher()

  assert isinstance(publisher, InMemoryEventPublisher)


def test_worker_main_respects_configured_batch_size(monkeypatch):
  monkeypatch.delenv('WORKOUT_EVENTS_QUEUE_URL', raising=False)
  monkeypatch.setenv('OUTBOX_BATCH_SIZE', '3')

  calls = []

  def fake_run(publisher, batch_size=10):
    calls.append(batch_size)
    return 0

  monkeypatch.setattr(worker.OutboxPublisher, 'run', fake_run)

  worker.main()

  assert calls == [3]


def test_worker_main_uses_default_batch_size_when_unset(monkeypatch):
  monkeypatch.delenv('WORKOUT_EVENTS_QUEUE_URL', raising=False)
  monkeypatch.delenv('OUTBOX_BATCH_SIZE', raising=False)

  calls = []

  def fake_run(publisher, batch_size=10):
    calls.append(batch_size)
    return 0

  monkeypatch.setattr(worker.OutboxPublisher, 'run', fake_run)

  worker.main()

  assert calls == [worker.DEFAULT_BATCH_SIZE]


def test_worker_exits_after_one_batch_not_a_polling_loop(monkeypatch):
  monkeypatch.delenv('WORKOUT_EVENTS_QUEUE_URL', raising=False)

  calls = []

  def fake_run(publisher, batch_size=10):
    calls.append(1)
    # pretend the batch was completely full -- a polling loop would keep
    # going to look for more; main() must not.
    return batch_size

  monkeypatch.setattr(worker.OutboxPublisher, 'run', fake_run)

  worker.main()

  assert len(calls) == 1


def test_worker_uses_in_memory_publisher_locally(monkeypatch):
  monkeypatch.delenv('WORKOUT_EVENTS_QUEUE_URL', raising=False)

  seen_publisher = {}

  def fake_run(publisher, batch_size=10):
    seen_publisher['value'] = publisher
    return 0

  monkeypatch.setattr(worker.OutboxPublisher, 'run', fake_run)

  worker.main()

  assert isinstance(seen_publisher['value'], InMemoryEventPublisher)


def test_worker_processes_a_real_outbox_event_end_to_end(monkeypatch, demo_user, make_workout_session):
  # no mocking of OutboxPublisher here -- a real completion, a real outbox
  # row, a real (in-memory) publish, against the real test database.
  monkeypatch.delenv('WORKOUT_EVENTS_QUEUE_URL', raising=False)
  monkeypatch.delenv('OUTBOX_BATCH_SIZE', raising=False)

  from application.complete_workout_session import CompleteWorkoutSessionAndRecordEvent

  session_id = make_workout_session(demo_user['uuid'])
  CompleteWorkoutSessionAndRecordEvent.run(session_id, demo_user['uuid'])

  processed = worker.main()

  assert processed >= 1
  rows = query_array_json(
    "SELECT published_at FROM public.outbox_events WHERE payload->>'workout_session_id' = %s",
    (session_id,)
  )
  assert rows[0]['published_at'] is not None
