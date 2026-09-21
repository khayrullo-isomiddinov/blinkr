import json
import threading
import uuid
from datetime import datetime, timezone

import pytest

from lib.db import execute, query_array_json, get_connection
from repositories.create_outbox_event import CreateOutboxEvent
from repositories.claim_unpublished_outbox_event import ClaimUnpublishedOutboxEvent
from application.outbox_publisher import OutboxPublisher


@pytest.fixture(autouse=True)
def clean_unpublished_outbox_rows(db_available):
  # These tests need precise control over "what's currently unpublished" --
  # other test files leave their own unpublished rows behind on purpose
  # (they're testing completion, not publishing), so start and end clean
  # rather than assuming an empty table.
  execute("DELETE FROM public.outbox_events WHERE published_at IS NULL")
  yield
  execute("DELETE FROM public.outbox_events WHERE published_at IS NULL")


@pytest.fixture
def make_outbox_event(db_available):
  def _make(event_type='workout.session.completed'):
    event_id = str(uuid.uuid4())
    payload = {
      'event_id': event_id,
      'event_type': event_type,
      'occurred_at': datetime.now(timezone.utc).isoformat(),
      'user_id': str(uuid.uuid4()),
      'workout_session_id': str(uuid.uuid4()),
    }
    return CreateOutboxEvent.run(event_id, event_type, json.dumps(payload))

  return _make


class FakePublisher:
  def __init__(self, fail_times=0):
    self.fail_times = fail_times
    self.calls = []

  def publish(self, event):
    self.calls.append(event)
    if self.fail_times > 0:
      self.fail_times -= 1
      raise RuntimeError('simulated publish failure')


def _fetch(outbox_id):
  return query_array_json(
    "SELECT published_at, attempts FROM public.outbox_events WHERE id = %s", (outbox_id,)
  )[0]


def test_unpublished_event_is_retrieved_and_processed(make_outbox_event):
  make_outbox_event()
  publisher = FakePublisher()

  processed = OutboxPublisher.run(publisher, batch_size=5)

  assert processed == 1
  assert len(publisher.calls) == 1


def test_successful_publication_marks_published_at(make_outbox_event):
  row = make_outbox_event()
  publisher = FakePublisher()

  OutboxPublisher.run(publisher, batch_size=5)

  fetched = _fetch(row['id'])
  assert fetched['published_at'] is not None
  assert fetched['attempts'] == 0


def test_failed_publication_increments_attempts_and_leaves_unpublished(make_outbox_event):
  row = make_outbox_event()
  publisher = FakePublisher(fail_times=1)

  OutboxPublisher.run(publisher, batch_size=5)

  fetched = _fetch(row['id'])
  assert fetched['published_at'] is None
  assert fetched['attempts'] == 1


def test_failed_publication_can_be_retried_and_then_succeeds(make_outbox_event):
  row = make_outbox_event()
  publisher = FakePublisher(fail_times=1)

  OutboxPublisher.run(publisher, batch_size=5)
  after_failure = _fetch(row['id'])
  assert after_failure['published_at'] is None
  assert after_failure['attempts'] == 1

  # same row, retried on a later run -- this time publish succeeds
  OutboxPublisher.run(publisher, batch_size=5)
  after_retry = _fetch(row['id'])
  assert after_retry['published_at'] is not None
  assert after_retry['attempts'] == 1  # success doesn't bump attempts again


def test_published_event_is_not_reclaimed_on_a_later_run(make_outbox_event):
  make_outbox_event()
  publisher = FakePublisher()
  OutboxPublisher.run(publisher, batch_size=5)
  assert len(publisher.calls) == 1

  processed_again = OutboxPublisher.run(publisher, batch_size=5)
  assert processed_again == 0
  assert len(publisher.calls) == 1


def test_event_payload_round_trips_through_the_outbox(make_outbox_event):
  row = make_outbox_event()
  publisher = FakePublisher()

  OutboxPublisher.run(publisher, batch_size=5)

  published_event = publisher.calls[0]
  wire = json.loads(published_event.to_json())
  assert wire == row['payload']
  assert published_event.event_id == row['event_id']
  assert published_event.event_type == row['event_type']


def test_concurrent_claims_do_not_select_the_same_row(make_outbox_event):
  make_outbox_event()

  conn_a = get_connection()
  conn_b = get_connection()
  try:
    claimed_a = ClaimUnpublishedOutboxEvent.run(conn=conn_a)
    assert claimed_a is not None

    # conn_a still holds the row lock (no commit yet) -- a second claimant
    # using SKIP LOCKED must see nothing to take, not block or duplicate it
    claimed_b = ClaimUnpublishedOutboxEvent.run(conn=conn_b)
    assert claimed_b is None

    conn_a.commit()
  finally:
    conn_a.close()
    conn_b.close()


def test_two_concurrent_publisher_runs_do_not_double_publish(make_outbox_event):
  row = make_outbox_event()

  claim_started = threading.Event()
  release_claim = threading.Event()

  class PausingPublisher:
    def __init__(self):
      self.calls = []

    def publish(self, event):
      claim_started.set()
      assert release_claim.wait(timeout=5)
      self.calls.append(event)

  publisher = PausingPublisher()
  results = {}

  def worker():
    results['processed'] = OutboxPublisher.run(publisher, batch_size=1)

  t = threading.Thread(target=worker)
  t.start()
  assert claim_started.wait(timeout=5)

  # attempted while the first run still holds the row's lock, mid-publish
  concurrent_processed = OutboxPublisher.run(publisher, batch_size=1)
  assert concurrent_processed == 0

  release_claim.set()
  t.join(timeout=5)

  assert results['processed'] == 1
  assert len(publisher.calls) == 1

  fetched = _fetch(row['id'])
  assert fetched['published_at'] is not None
