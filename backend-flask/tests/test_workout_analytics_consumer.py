import json
import os
import sys
import uuid
from datetime import datetime, timezone

import psycopg2
from botocore.exceptions import ClientError

# The Lambda consumer is a separate deployable unit under infra/lambda/,
# not part of the backend-flask package -- imported here (rather than
# duplicated) so its tests can reuse this project's existing Postgres
# fixtures/conventions.
_LAMBDA_DIR = os.path.abspath(
  os.path.join(os.path.dirname(__file__), '..', '..', 'infra', 'lambda', 'workout-analytics-consumer')
)
if _LAMBDA_DIR not in sys.path:
  sys.path.insert(0, _LAMBDA_DIR)

import handler as workout_analytics_handler  # noqa: E402

from lib.db import execute  # noqa: E402


class FakeDynamoDBClient:
  """Stands in for boto3's DynamoDB client -- no real AWS call anywhere
  in this file."""

  def __init__(self, fail_with=None, duplicate=False):
    self.calls = []
    self.fail_with = fail_with
    self.duplicate = duplicate

  def transact_write_items(self, TransactItems):
    self.calls.append(TransactItems)
    if self.duplicate:
      raise ClientError(
        {
          'Error': {'Code': 'TransactionCanceledException', 'Message': 'Transaction cancelled'},
          'CancellationReasons': [{'Code': 'ConditionalCheckFailed'}, {'Code': 'None'}],
        },
        'TransactWriteItems'
      )
    if self.fail_with:
      raise self.fail_with
    return {}


class FakeCursor:
  def __init__(self, row=None, raise_error=None):
    self.row = row
    self.raise_error = raise_error

  def __enter__(self):
    return self

  def __exit__(self, *exc):
    return False

  def execute(self, sql, params=None):
    if self.raise_error:
      raise self.raise_error

  def fetchone(self):
    return self.row


class FakeConnection:
  def __init__(self, row=None, raise_error=None):
    self.row = row
    self.raise_error = raise_error
    self.closed = False

  def cursor(self):
    return FakeCursor(self.row, self.raise_error)

  def close(self):
    self.closed = True


def make_db_factory(row=None, raise_error=None):
  return lambda: FakeConnection(row=row, raise_error=raise_error)


def _record(payload, message_id='msg-1'):
  return {'messageId': message_id, 'body': json.dumps(payload)}


def _completed_event_payload(**overrides):
  payload = {
    'event_id': str(uuid.uuid4()),
    'event_type': 'workout.session.completed',
    'occurred_at': '2026-01-01T10:30:00+00:00',
    'user_id': str(uuid.uuid4()),
    'workout_session_id': str(uuid.uuid4()),
  }
  payload.update(overrides)
  return payload


def test_valid_event_processing_updates_dynamodb():
  started = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
  completed = datetime(2026, 1, 1, 10, 45, tzinfo=timezone.utc)
  fake_dynamo = FakeDynamoDBClient()
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo,
    db_connection_factory=make_db_factory(row=(started, completed)),
    table_name='test-table',
  )
  payload = _completed_event_payload()

  result = consumer.process_batch({'Records': [_record(payload)]})

  assert result['batchItemFailures'] == []
  assert len(fake_dynamo.calls) == 1
  items = fake_dynamo.calls[0]
  assert items[0]['Put']['Item']['pk']['S'] == f"EVENT#{payload['event_id']}"
  assert items[0]['Put']['ConditionExpression'] == 'attribute_not_exists(pk)'
  assert items[1]['Update']['Key']['pk']['S'] == f"USER#{payload['user_id']}"
  assert items[1]['Update']['ExpressionAttributeValues'][':duration']['N'] == '2700'  # 45 min


def test_unsupported_event_type_is_ignored_not_failed():
  fake_dynamo = FakeDynamoDBClient()
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo, db_connection_factory=make_db_factory(), table_name='t'
  )
  payload = _completed_event_payload(event_type='some.other.event')

  result = consumer.process_batch({'Records': [_record(payload)]})

  assert result['batchItemFailures'] == []
  assert fake_dynamo.calls == []


def test_duplicate_event_id_does_not_fail_or_double_process():
  fake_dynamo = FakeDynamoDBClient(duplicate=True)
  started = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
  completed = datetime(2026, 1, 1, 10, 30, tzinfo=timezone.utc)
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo,
    db_connection_factory=make_db_factory(row=(started, completed)),
    table_name='t',
  )
  payload = _completed_event_payload()

  result = consumer.process_batch({'Records': [_record(payload)]})

  assert result['batchItemFailures'] == []
  assert len(fake_dynamo.calls) == 1  # attempted once, cancellation caught cleanly


def test_aggregate_update_uses_correct_duration_and_ids():
  started = datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)
  completed = datetime(2026, 1, 1, 9, 12, 30, tzinfo=timezone.utc)  # 12.5 min = 750s
  fake_dynamo = FakeDynamoDBClient()
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo,
    db_connection_factory=make_db_factory(row=(started, completed)),
    table_name='t',
  )
  payload = _completed_event_payload()

  consumer.process_batch({'Records': [_record(payload)]})

  values = fake_dynamo.calls[0][1]['Update']['ExpressionAttributeValues']
  assert values[':duration']['N'] == '750'
  assert values[':one']['N'] == '1'
  assert values[':occurred_at']['S'] == payload['occurred_at']
  assert values[':user_id']['S'] == payload['user_id']


def test_postgres_lookup_failure_is_reported_as_batch_failure():
  fake_dynamo = FakeDynamoDBClient()
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo,
    db_connection_factory=make_db_factory(row=None),  # session not found
    table_name='t',
  )
  payload = _completed_event_payload()

  result = consumer.process_batch({'Records': [_record(payload, message_id='msg-x')]})

  assert result['batchItemFailures'] == [{'itemIdentifier': 'msg-x'}]
  assert fake_dynamo.calls == []


def test_dynamodb_failure_is_reported_as_batch_failure():
  fake_dynamo = FakeDynamoDBClient(fail_with=RuntimeError('dynamodb is down'))
  started = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
  completed = datetime(2026, 1, 1, 10, 15, tzinfo=timezone.utc)
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo,
    db_connection_factory=make_db_factory(row=(started, completed)),
    table_name='t',
  )
  payload = _completed_event_payload()

  result = consumer.process_batch({'Records': [_record(payload, message_id='msg-y')]})

  assert result['batchItemFailures'] == [{'itemIdentifier': 'msg-y'}]


def test_partial_batch_failure_only_reports_the_failing_record():
  started = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
  completed = datetime(2026, 1, 1, 10, 20, tzinfo=timezone.utc)

  class SwitchingDbFactory:
    def __init__(self):
      self.calls = 0

    def __call__(self):
      self.calls += 1
      if self.calls == 1:
        return FakeConnection(row=(started, completed))
      raise RuntimeError('simulated failure for the second record')

  fake_dynamo = FakeDynamoDBClient()
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo,
    db_connection_factory=SwitchingDbFactory(),
    table_name='t',
  )

  good_payload = _completed_event_payload()
  bad_payload = _completed_event_payload()
  ignored_payload = _completed_event_payload(event_type='something.else')

  result = consumer.process_batch({'Records': [
    _record(good_payload, message_id='good'),
    _record(bad_payload, message_id='bad'),
    _record(ignored_payload, message_id='ignored'),
  ]})

  assert result['batchItemFailures'] == [{'itemIdentifier': 'bad'}]
  assert len(fake_dynamo.calls) == 1  # only the good record ever reached dynamodb


def test_malformed_json_body_is_reported_as_batch_failure():
  fake_dynamo = FakeDynamoDBClient()
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo, db_connection_factory=make_db_factory(), table_name='t'
  )

  result = consumer.process_batch({'Records': [{'messageId': 'bad-json', 'body': 'not valid json'}]})

  assert result['batchItemFailures'] == [{'itemIdentifier': 'bad-json'}]
  assert fake_dynamo.calls == []


def test_missing_required_fields_is_reported_as_batch_failure():
  fake_dynamo = FakeDynamoDBClient()
  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=fake_dynamo, db_connection_factory=make_db_factory(), table_name='t'
  )
  incomplete = {'event_id': str(uuid.uuid4()), 'event_type': 'workout.session.completed'}

  result = consumer.process_batch({'Records': [_record(incomplete, message_id='incomplete')]})

  assert result['batchItemFailures'] == [{'itemIdentifier': 'incomplete'}]
  assert fake_dynamo.calls == []


def test_handler_entrypoint_constructs_consumer_from_env(monkeypatch):
  monkeypatch.setenv('ANALYTICS_TABLE_NAME', 'test-table')
  workout_analytics_handler._consumer = None  # reset the module-level singleton

  fake_dynamo = FakeDynamoDBClient()
  monkeypatch.setattr(workout_analytics_handler.boto3, 'client', lambda name: fake_dynamo)

  started = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
  completed = datetime(2026, 1, 1, 10, 10, tzinfo=timezone.utc)
  monkeypatch.setattr(
    workout_analytics_handler, '_default_db_connection',
    lambda: FakeConnection(row=(started, completed))
  )

  payload = _completed_event_payload()
  result = workout_analytics_handler.handler({'Records': [_record(payload)]}, None)

  assert result['batchItemFailures'] == []
  assert len(fake_dynamo.calls) == 1

  workout_analytics_handler._consumer = None  # don't leak into other tests


def test_fetch_duration_seconds_against_real_postgres(demo_user, make_workout_session):
  # No mocking of the database here -- proves the SQL query itself is
  # correct against the real schema, not just against a fake cursor.
  session_id = make_workout_session(demo_user['uuid'])
  execute(
    "UPDATE public.workout_sessions SET completed_at = started_at + interval '20 minutes' WHERE id = %s",
    (session_id,)
  )

  consumer = workout_analytics_handler.WorkoutAnalyticsConsumer(
    dynamodb_client=FakeDynamoDBClient(),
    db_connection_factory=lambda: psycopg2.connect(os.environ['DATABASE_URL']),
    table_name='t',
  )

  duration = consumer._fetch_duration_seconds(session_id)

  assert duration == 1200.0
