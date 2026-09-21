import os

from events.publisher_factory import build_event_publisher
from application.outbox_publisher import OutboxPublisher

# Standalone outbox worker: processes one batch of unpublished outbox_events
# and exits -- meant to be invoked repeatedly by an external scheduler (a
# cron entry, an ECS scheduled task, eventually a Lambda), not to poll
# forever itself. Deliberately imports nothing from app.py -- no Flask, no
# Cognito JWKS fetch, no X-Ray/OpenTelemetry/Rollbar/CloudWatch init -- so
# it starts fast and has nothing to do with handling HTTP requests.
#
# DB connections are handled entirely inside OutboxPublisher (via
# lib.db.transaction()), the same connection/transaction pattern the rest
# of the app already uses -- this module doesn't open one itself.
#
# Local dev: with WORKOUT_EVENTS_QUEUE_URL unset (the default in
# docker-compose), this uses the in-memory publisher, same as the app and
# test suite -- run it with the backend's existing environment, e.g.:
#   docker compose exec backend-flask python worker.py

DEFAULT_BATCH_SIZE = 10


def main():
  batch_size = int(os.getenv('OUTBOX_BATCH_SIZE', str(DEFAULT_BATCH_SIZE)))
  publisher = build_event_publisher()

  processed = OutboxPublisher.run(publisher, batch_size=batch_size)
  print(f"outbox worker: processed {processed} event(s)")
  return processed


if __name__ == "__main__":
  main()
