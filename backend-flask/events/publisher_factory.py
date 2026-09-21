import os

from events.in_memory_publisher import InMemoryEventPublisher
from events.aws_publisher import AWSEventPublisher


def build_event_publisher():
  # AWS (SQS) when a queue URL is configured (ECS sets this); otherwise the
  # in-memory publisher, which is what local dev and the test suite use --
  # neither requires AWS credentials. Shared by app.py (the Flask process)
  # and worker.py (the outbox worker) so the selection logic exists in
  # exactly one place.
  queue_url = os.getenv('WORKOUT_EVENTS_QUEUE_URL')
  if queue_url:
    return AWSEventPublisher(queue_url=queue_url)
  return InMemoryEventPublisher()
