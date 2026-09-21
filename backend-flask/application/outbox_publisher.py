import json

from lib.db import transaction
from repositories.claim_unpublished_outbox_event import ClaimUnpublishedOutboxEvent
from repositories.mark_outbox_event_published import MarkOutboxEventPublished
from repositories.increment_outbox_event_attempts import IncrementOutboxEventAttempts


class OutboxEvent:
  """
  Minimal event-like wrapper around a claimed outbox row -- exposes just
  enough (event_id, event_type, to_json()) for an EventPublisher to publish
  it, without needing to reconstruct the original WorkoutSessionCompleted
  (or any future event type the outbox ends up holding).
  """
  def __init__(self, event_id, event_type, payload):
    self.event_id = str(event_id)
    self.event_type = event_type
    self._payload = payload

  def to_json(self):
    return json.dumps(self._payload)


class OutboxPublisher:
  # Callable application component that drains unpublished outbox rows
  # through the existing EventPublisher abstraction -- not a worker itself;
  # meant to be invoked repeatedly by one (a scheduled task, a future
  # Lambda) that isn't built yet.
  #
  # SQS gives at-least-once delivery, and this component is built on that
  # assumption rather than pretending otherwise: if this process crashes
  # after a successful publish but before its published_at commit lands,
  # the same row is still unpublished next run and gets sent again.
  # Consumer-side deduplication (e.g. by event_id) is a future concern, not
  # handled here.
  def run(publisher, batch_size=10):
    processed = 0
    attempted_ids = set()
    for _ in range(batch_size):
      claimed_id = OutboxPublisher._process_one(publisher, exclude_ids=attempted_ids)
      if claimed_id is None:
        break
      attempted_ids.add(claimed_id)
      processed += 1
    return processed

  @staticmethod
  def _process_one(publisher, exclude_ids=None):
    # One transaction per event: FOR UPDATE SKIP LOCKED (inside
    # ClaimUnpublishedOutboxEvent) means a second concurrent caller running
    # this same query skips a row already claimed here rather than
    # blocking on or re-claiming it, so two publisher runs never process
    # the same row at once.
    with transaction() as conn:
      row = ClaimUnpublishedOutboxEvent.run(conn=conn, exclude_ids=exclude_ids)
      if row is None:
        return None

      event = OutboxEvent(row['event_id'], row['event_type'], row['payload'])

      try:
        publisher.publish(event)
      except Exception:
        # Failed attempt: record it and leave published_at NULL so this
        # row is picked up again on a future run -- not retried again
        # within this same run() call (see `exclude_ids`). The transaction
        # still commits here -- only the publish call failed, not the DB
        # write recording that fact.
        IncrementOutboxEventAttempts.run(row['id'], conn=conn)
        return row['id']

      MarkOutboxEventPublished.run(row['id'], conn=conn)
      return row['id']
