from lib.db import execute


class CreateOutboxEvent:
  def run(event_id, event_type, payload, conn=None):
    return execute(
      """
      INSERT INTO public.outbox_events (event_id, event_type, payload)
      VALUES (%s, %s, %s)
      RETURNING id, event_id, event_type, payload, created_at, published_at, attempts
      """,
      (event_id, event_type, payload),
      conn=conn
    )
