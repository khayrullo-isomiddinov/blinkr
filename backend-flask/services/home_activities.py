from opentelemetry import trace
from datetime import datetime, timedelta, timezone

tracer = trace.get_tracer("home.activities")


class HomeActivities:

    def run(logger=None, cognito_user_id=None):
        with tracer.start_as_current_span("home-activities-data"):
            span = trace.get_current_span()

            now = datetime.now(timezone.utc).astimezone()

            if logger:
                logger.info("HomeActivities.run: fetching home activities")


            results = [
                {
                    "uuid": "68f126b0-1ceb-4a33-88be-d90fa7109eee",
                    "handle": "Andrew Brown",
                    "message": "Cloud is really really fun!",
                    "created_at": (now - timedelta(days=2)).isoformat(),
                    "expires_at": (now + timedelta(days=5)).isoformat(),
                    "likes_count": 5,
                    "replies_count": 1,
                    "reposts_count": 0,
                    "replies": [
                        {
                            "uuid": "26e12864-1c26-5c3a-9658-97a10f8fea67",
                            "reply_to_activity_uuid": "68f126b0-1ceb-4a33-88be-d90fa7109eee",
                            "handle": "Worf",
                            "message": "This post has no honor at all!!!!!!!",
                            "likes_count": 0,
                            "replies_count": 0,
                            "reposts_count": 0,
                            "created_at": (now - timedelta(days=2)).isoformat(),
                        }
                    ],
                },
                {
                    "uuid": "66e12864-8c26-4c3a-9658-95a10f8fea67",
                    "handle": "Worf",
                    "message": "I am out of prune juice. yo tambien",
                    "created_at": (now - timedelta(days=7)).isoformat(),
                    "expires_at": (now + timedelta(days=9)).isoformat(),
                    "likes": 0,
                    "replies": [],
                },
                {
                    "uuid": "248959df-3079-4947-b847-9e0892d1bab4",
                    "handle": "Garek",
                    "message": "My dear doctor, I am just simple tailor",
                    "created_at": (now - timedelta(hours=1)).isoformat(),
                    "expires_at": (now + timedelta(hours=12)).isoformat(),
                    "likes": 0,
                    "replies": [],
                },
            ]

            if cognito_user_id:
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