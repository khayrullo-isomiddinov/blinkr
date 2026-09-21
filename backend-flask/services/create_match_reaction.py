from opentelemetry import trace

from lib.db import execute, query_array_json

tracer = trace.get_tracer("match.reactions")


class CreateMatchReaction:
  def run(match_uuid, user_uuid, message):
    with tracer.start_as_current_span("create-match-reaction"):
      span = trace.get_current_span()
      span.set_attribute("app.match_uuid", match_uuid)

      model = {'errors': None, 'data': None}

      if message is None or len(message) < 1:
        model['errors'] = ['message_blank']
        return model
      if len(message) > 280:
        model['errors'] = ['message_exceed_max_chars']
        return model

      matches = query_array_json("SELECT uuid, status FROM public.matches WHERE uuid = %s", (match_uuid,))
      if not matches:
        model['errors'] = ['match_not_found']
        return model
      match = matches[0]

      # Visible for the rest of the match; matches already finished only get a
      # short grace window (also tightened for still-live matches once
      # CreateMatchEvent records their FULL_TIME event).
      expires_minutes = 30 if match['status'] == 'finished' else 180
      span.set_attribute("app.expires_minutes", expires_minutes)

      row = execute(
        """
        INSERT INTO public.match_reactions (match_uuid, user_uuid, message, expires_at)
        SELECT %s, uuid, %s, current_timestamp + (%s || ' minutes')::interval
        FROM public.users WHERE uuid = %s
        RETURNING uuid, message, created_at, expires_at
        """,
        (match_uuid, message, expires_minutes, user_uuid)
      )
      if row is None:
        model['errors'] = ['user_not_found']
        return model

      users = query_array_json("SELECT display_name, handle FROM public.users WHERE uuid = %s", (user_uuid,))
      user = users[0] if users else {}

      model['data'] = {
        'uuid': row['uuid'],
        'display_name': user.get('display_name'),
        'handle': user.get('handle'),
        'message': row['message'],
        'created_at': row['created_at'].isoformat(),
        'expires_at': row['expires_at'].isoformat(),
      }
      return model
