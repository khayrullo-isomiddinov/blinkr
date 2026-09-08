from opentelemetry import trace
from datetime import datetime, timedelta, timezone

from lib.db import query_array_json

tracer = trace.get_tracer("home.activities")


class HomeActivities:

    def run(logger=None, cognito_user_id=None):
        with tracer.start_as_current_span("home-activities-data"):
            span = trace.get_current_span()

            if logger:
                logger.info("HomeActivities.run: fetching home activities")

            sql = """
                SELECT
                  activities.uuid,
                  users.display_name,
                  users.handle,
                  activities.message,
                  activities.replies_count,
                  activities.reposts_count,
                  activities.likes_count,
                  activities.reply_to_activity_uuid,
                  activities.expires_at,
                  activities.created_at
                FROM public.activities
                LEFT JOIN public.users ON users.uuid = activities.user_uuid
                ORDER BY activities.created_at DESC
            """
            results = query_array_json(sql)

            if cognito_user_id:
                now = datetime.now(timezone.utc).astimezone()
                results.insert(0, {
                    "uuid": "aa9db958-a1b6-4d24-b0c9-2c9e5c9e5c9e",
                    "handle": cognito_user_id,
                    "message": "This crud is only visible to signed-in users!",
                    "created_at": now.isoformat(),
                    "expires_at": (now + timedelta(days=1)).isoformat(),
                    "likes_count": 0,
                    "replies_count": 0,
                    "reposts_count": 0,
                    "replies": [],
                })

            span.set_attribute("app.result_length", len(results))
            return results
