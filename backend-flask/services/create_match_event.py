from opentelemetry import trace

from lib.db import execute, query_array_json

VALID_EVENT_TYPES = ('GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'HALF_TIME', 'FULL_TIME')

tracer = trace.get_tracer("match.events")


class CreateMatchEvent:
  def run(match_uuid, event_type, minute, team_uuid=None, player_name=None, detail=None):
    with tracer.start_as_current_span("create-match-event"):
      span = trace.get_current_span()
      span.set_attribute("app.match_uuid", match_uuid)
      span.set_attribute("app.event_type", str(event_type))

      model = {'errors': None, 'data': None}

      if event_type not in VALID_EVENT_TYPES:
        model['errors'] = ['event_type_invalid']
        return model

      if minute is None or not isinstance(minute, int) or minute < 0:
        model['errors'] = ['minute_invalid']
        return model

      matches = query_array_json(
        "SELECT uuid, home_team_uuid, away_team_uuid FROM public.matches WHERE uuid = %s",
        (match_uuid,)
      )
      if not matches:
        model['errors'] = ['match_not_found']
        return model
      match = matches[0]

      row = execute(
        """
        INSERT INTO public.match_events (match_uuid, team_uuid, event_type, minute, player_name, detail)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING uuid, event_type, minute, player_name, detail, created_at
        """,
        (match_uuid, team_uuid, event_type, minute, player_name, detail)
      )

      # This span is the single place match state derives from events --
      # score/status changes are a direct, traceable side effect of the
      # event that caused them, not scattered across routes.
      with tracer.start_as_current_span("apply-match-event-side-effects") as effects_span:
        if event_type == 'GOAL' and team_uuid:
          if team_uuid == match['home_team_uuid']:
            effects_span.set_attribute("app.scoring_side", "home")
            execute("UPDATE public.matches SET home_score = home_score + 1 WHERE uuid = %s", (match_uuid,))
          elif team_uuid == match['away_team_uuid']:
            effects_span.set_attribute("app.scoring_side", "away")
            execute("UPDATE public.matches SET away_score = away_score + 1 WHERE uuid = %s", (match_uuid,))
        elif event_type == 'HALF_TIME':
          execute("UPDATE public.matches SET status = 'half_time' WHERE uuid = %s", (match_uuid,))
        elif event_type == 'FULL_TIME':
          execute("UPDATE public.matches SET status = 'finished' WHERE uuid = %s", (match_uuid,))
          execute(
            """
            UPDATE public.match_reactions
            SET expires_at = LEAST(expires_at, current_timestamp + interval '30 minutes')
            WHERE match_uuid = %s AND expires_at > current_timestamp + interval '30 minutes'
            """,
            (match_uuid,)
          )

      model['data'] = row
      return model
