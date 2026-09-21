import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

WORKOUT_SESSION_COMPLETED_EVENT_TYPE = 'workout.session.completed'
REQUIRED_EVENT_FIELDS = ('event_id', 'event_type', 'occurred_at', 'user_id', 'workout_session_id')


class MalformedEventError(Exception):
  pass


class UnsupportedEventTypeError(Exception):
  def __init__(self, event_type):
    super().__init__(f'unsupported event_type: {event_type}')
    self.event_type = event_type


class WorkoutSessionLookupError(Exception):
  pass


_cached_database_url = None


def _default_db_connection():
  # Deliberately lazy imports (psycopg2 isn't in the Lambda runtime by
  # default and isn't needed at all when a db_connection_factory is
  # injected, e.g. in tests) -- see the final report for what this Lambda
  # still needs at deploy time to actually reach RDS/SSM from inside a VPC
  # with no NAT gateway.
  import psycopg2

  global _cached_database_url
  if _cached_database_url is None:
    parameter_name = os.environ['DATABASE_URL_PARAMETER_NAME']
    ssm = boto3.client('ssm')
    _cached_database_url = ssm.get_parameter(
      Name=parameter_name, WithDecryption=True
    )['Parameter']['Value']

  return psycopg2.connect(_cached_database_url)


class WorkoutAnalyticsConsumer:
  """
  Consumes WorkoutSessionCompleted events from SQS and maintains a derived,
  per-user aggregate in DynamoDB (blinkr-workout-analytics). PostgreSQL
  stays the source of truth -- this table only ever holds a rollup,
  rebuildable from Postgres + outbox_events history if it were ever lost.

  Dependencies are injectable (dynamodb_client, db_connection_factory,
  table_name) specifically so tests never need real AWS credentials or a
  real Postgres connection.
  """
  def __init__(self, dynamodb_client=None, db_connection_factory=None, table_name=None):
    self.dynamodb = dynamodb_client if dynamodb_client is not None else boto3.client('dynamodb')
    self.db_connection_factory = db_connection_factory or _default_db_connection
    self.table_name = table_name or os.environ['ANALYTICS_TABLE_NAME']

  def process_batch(self, event):
    # SQS partial batch response: only failed messageIds go here, so a
    # record that succeeded (or was cleanly ignored as unsupported) in the
    # same batch as a failing one is never redelivered unnecessarily.
    batch_item_failures = []
    for record in event.get('Records', []):
      message_id = record.get('messageId')
      try:
        self.process_record(record)
      except UnsupportedEventTypeError as e:
        # Forward-compatible: a future event type this consumer doesn't
        # handle yet. Not a failure -- ack it so it isn't retried forever.
        logger.info('ignoring unsupported event_type=%s (messageId=%s)', e.event_type, message_id)
      except Exception:
        logger.exception('failed to process record messageId=%s', message_id)
        if message_id:
          batch_item_failures.append({'itemIdentifier': message_id})
    return {'batchItemFailures': batch_item_failures}

  def process_record(self, record):
    try:
      payload = json.loads(record.get('body'))
    except (TypeError, ValueError) as e:
      raise MalformedEventError(f'invalid JSON body: {e}') from e

    if not isinstance(payload, dict):
      raise MalformedEventError('event body is not a JSON object')

    missing = [field for field in REQUIRED_EVENT_FIELDS if field not in payload]
    if missing:
      raise MalformedEventError(f'missing required fields: {missing}')

    if payload['event_type'] != WORKOUT_SESSION_COMPLETED_EVENT_TYPE:
      raise UnsupportedEventTypeError(payload['event_type'])

    self._handle_workout_session_completed(payload)

  def _handle_workout_session_completed(self, payload):
    duration_seconds = self._fetch_duration_seconds(payload['workout_session_id'])
    self._record_completion(
      event_id=payload['event_id'],
      event_type=payload['event_type'],
      user_id=payload['user_id'],
      occurred_at=payload['occurred_at'],
      duration_seconds=duration_seconds,
    )

  def _fetch_duration_seconds(self, workout_session_id):
    # The event only carries ids -- deliberately, so it doesn't need to
    # grow every time we want a new derived stat. Postgres remains the
    # source of truth for what actually happened in the workout.
    conn = self.db_connection_factory()
    try:
      with conn.cursor() as cur:
        cur.execute(
          "SELECT started_at, completed_at FROM public.workout_sessions WHERE id = %s",
          (workout_session_id,)
        )
        row = cur.fetchone()
    finally:
      conn.close()

    if row is None:
      raise WorkoutSessionLookupError(f'workout session not found: {workout_session_id}')

    started_at, completed_at = row
    if started_at is None or completed_at is None:
      raise WorkoutSessionLookupError(f'workout session missing timestamps: {workout_session_id}')

    return max(0, (completed_at - started_at).total_seconds())

  def _record_completion(self, event_id, event_type, user_id, occurred_at, duration_seconds):
    now = datetime.now(timezone.utc).isoformat()
    try:
      self.dynamodb.transact_write_items(TransactItems=[
        {
          # Idempotency marker: this Put is the whole idempotency
          # mechanism. If event_id was already processed, the condition
          # fails and the ENTIRE transaction (including the aggregate
          # Update below) is cancelled atomically -- the aggregate can
          # never be double-counted by a duplicate at-least-once delivery.
          'Put': {
            'TableName': self.table_name,
            'Item': {
              'pk': {'S': f'EVENT#{event_id}'},
              'item_type': {'S': 'PROCESSED_EVENT'},
              'event_id': {'S': event_id},
              'event_type': {'S': event_type},
              'processed_at': {'S': now},
            },
            'ConditionExpression': 'attribute_not_exists(pk)',
          }
        },
        {
          'Update': {
            'TableName': self.table_name,
            'Key': {'pk': {'S': f'USER#{user_id}'}},
            'UpdateExpression': (
              'SET item_type = :item_type, user_id = :user_id, '
              'last_completed_at = :occurred_at, updated_at = :now '
              'ADD total_completed_workouts :one, total_duration_seconds :duration'
            ),
            'ExpressionAttributeValues': {
              ':item_type': {'S': 'USER_AGGREGATE'},
              ':user_id': {'S': user_id},
              ':occurred_at': {'S': occurred_at},
              ':now': {'S': now},
              ':one': {'N': '1'},
              ':duration': {'N': str(int(duration_seconds))},
            },
          }
        },
      ])
    except ClientError as e:
      if e.response.get('Error', {}).get('Code') == 'TransactionCanceledException' and self._is_duplicate_event(e):
        logger.info('duplicate event_id=%s already processed -- skipping', event_id)
        return
      raise

  @staticmethod
  def _is_duplicate_event(client_error):
    reasons = client_error.response.get('CancellationReasons', [])
    if not reasons:
      return False
    # Index 0 is the EVENT# idempotency Put in the TransactItems list above.
    return reasons[0].get('Code') == 'ConditionalCheckFailed'


_consumer = None


def handler(event, context):
  global _consumer
  if _consumer is None:
    _consumer = WorkoutAnalyticsConsumer()
  return _consumer.process_batch(event)
