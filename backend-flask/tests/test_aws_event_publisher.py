import inspect
import json
import uuid
from datetime import datetime

import pytest

import application.complete_workout_session as complete_workout_session_module
import application.outbox_publisher as outbox_publisher_module
from application.outbox_publisher import OutboxPublisher
from events.workout_session_completed import WorkoutSessionCompleted, EVENT_TYPE
from events.publisher import EventPublishError
from events.aws_publisher import AWSEventPublisher


def _make_event():
  return WorkoutSessionCompleted(user_id=str(uuid.uuid4()), workout_session_id=str(uuid.uuid4()))


class FakeSQSClient:
  """A hand-rolled stand-in for boto3's SQS client -- no real AWS SDK call
  is ever made in this file."""

  def __init__(self, fail=False):
    self.fail = fail
    self.calls = []

  def send_message(self, QueueUrl, MessageBody):
    if self.fail:
      raise RuntimeError('simulated SQS failure')
    self.calls.append({'QueueUrl': QueueUrl, 'MessageBody': MessageBody})


def test_event_serializes_to_stable_wire_format():
  event = _make_event()
  payload = json.loads(event.to_json())

  assert set(payload.keys()) == {'event_id', 'event_type', 'occurred_at', 'user_id', 'workout_session_id'}
  assert payload['event_id'] == event.event_id
  assert payload['event_type'] == EVENT_TYPE
  assert payload['user_id'] == event.user_id
  assert payload['workout_session_id'] == event.workout_session_id
  # occurred_at must be a plain ISO-8601 string, not a Python datetime repr
  assert isinstance(payload['occurred_at'], str)
  assert datetime.fromisoformat(payload['occurred_at']) == event.occurred_at


def test_aws_publisher_sends_expected_payload_to_configured_queue():
  queue_url = 'https://sqs.eu-central-1.amazonaws.com/123456789012/blinkr-workout-events'
  fake_client = FakeSQSClient()
  publisher = AWSEventPublisher(queue_url=queue_url, sqs_client=fake_client)
  event = _make_event()

  publisher.publish(event)

  assert len(fake_client.calls) == 1
  call = fake_client.calls[0]
  assert call['QueueUrl'] == queue_url
  assert json.loads(call['MessageBody']) == json.loads(event.to_json())


def test_aws_publisher_uses_configured_queue_url_not_hardcoded():
  fake_client = FakeSQSClient()
  custom_url = 'https://sqs.eu-central-1.amazonaws.com/123456789012/some-other-queue'
  publisher = AWSEventPublisher(queue_url=custom_url, sqs_client=fake_client)

  publisher.publish(_make_event())

  assert fake_client.calls[0]['QueueUrl'] == custom_url


def test_aws_publisher_failure_is_surfaced_not_swallowed():
  fake_client = FakeSQSClient(fail=True)
  publisher = AWSEventPublisher(queue_url='https://example.invalid/queue', sqs_client=fake_client)

  with pytest.raises(EventPublishError):
    publisher.publish(_make_event())


def test_completion_flow_never_references_aws_or_the_publisher_abstraction():
  # completion now only writes to Postgres (the workout row + its outbox
  # event, same transaction) -- it doesn't touch AWS, boto3, or even the
  # EventPublisher abstraction itself, since it no longer publishes
  # synchronously (that's OutboxPublisher's job, checked separately below).
  source = inspect.getsource(complete_workout_session_module)
  assert 'boto3' not in source
  assert 'AWSEventPublisher' not in source
  assert 'EventPublisher' not in source
  assert 'events.publisher' not in source
  assert 'events.aws_publisher' not in source
  assert 'events.in_memory_publisher' not in source


def test_outbox_publisher_depends_on_the_abstraction_not_on_aws_directly(demo_user, make_workout_session):
  # OutboxPublisher (not the completion flow) is the piece that talks to
  # EventPublisher -- confirm its module doesn't reference AWS/boto3 at
  # all, then prove it works with an arbitrary object that merely
  # implements .publish(), not just the two concrete publisher classes we
  # ship.
  source = inspect.getsource(outbox_publisher_module)
  assert 'boto3' not in source
  assert 'AWSEventPublisher' not in source

  from application.complete_workout_session import CompleteWorkoutSessionAndRecordEvent

  calls = []

  class FakePublisher:
    def publish(self, event):
      calls.append(event)

  session_id = make_workout_session(demo_user['uuid'])
  CompleteWorkoutSessionAndRecordEvent.run(session_id, demo_user['uuid'])

  processed = OutboxPublisher.run(FakePublisher(), batch_size=50)

  assert processed >= 1
  assert any(json.loads(event.to_json()).get('workout_session_id') == session_id for event in calls)
