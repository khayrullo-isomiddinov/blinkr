from lib.db import query_array_json


class ClaimUnpublishedOutboxEvent:
  # Must be called with `conn` from an open transaction -- FOR UPDATE SKIP
  # LOCKED only prevents two callers claiming the same row while that
  # transaction (and its row lock) is still open. A concurrent caller
  # running this same query meanwhile just skips the locked row and gets
  # the next unpublished one instead (or None), rather than blocking.
  #
  # `exclude_ids` lets a single batch run skip rows it has already
  # attempted (and failed) earlier in that same run, so a repeatedly
  # failing event doesn't get hammered in a tight loop -- it's picked up
  # again on the *next* run instead, as intended by "leave failed events
  # unpublished so they can be retried later".
  def run(conn=None, exclude_ids=None):
    if exclude_ids:
      sql = """
        SELECT id, event_id, event_type, payload
        FROM public.outbox_events
        WHERE published_at IS NULL AND id != ALL(%s::uuid[])
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      """
      params = (list(exclude_ids),)
    else:
      sql = """
        SELECT id, event_id, event_type, payload
        FROM public.outbox_events
        WHERE published_at IS NULL
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      """
      params = None

    rows = query_array_json(sql, params, conn=conn)
    if not rows:
      return None
    return rows[0]
