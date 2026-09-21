from lib.db import execute


class MarkOutboxEventPublished:
  def run(outbox_event_id, conn=None):
    return execute(
      """
      UPDATE public.outbox_events
      SET published_at = current_timestamp
      WHERE id = %s
      RETURNING id, event_id, event_type, published_at, attempts
      """,
      (outbox_event_id,),
      conn=conn
    )
