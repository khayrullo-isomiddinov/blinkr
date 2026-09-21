from lib.db import execute


class IncrementOutboxEventAttempts:
  def run(outbox_event_id, conn=None):
    return execute(
      """
      UPDATE public.outbox_events
      SET attempts = attempts + 1
      WHERE id = %s
      RETURNING id, event_id, event_type, published_at, attempts
      """,
      (outbox_event_id,),
      conn=conn
    )
