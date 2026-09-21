from datetime import datetime, timezone

from lib.db import transaction
from repositories.admin_overview_counts import AdminOverviewCounts
from repositories.admin_recent_completed_workouts import AdminRecentCompletedWorkouts

RECENT_ACTIVITY_LIMIT = 10


def _iso(moment):
  return moment.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def build_overview():
  # A read-only, single-snapshot transaction: the counts and the activity list agree with each other.
  with transaction() as conn:
    conn.set_session(isolation_level='REPEATABLE READ', readonly=True)
    counts = AdminOverviewCounts.run(conn=conn)
    recent = AdminRecentCompletedWorkouts.run(RECENT_ACTIVITY_LIMIT, conn=conn)

  return {
    'generated_at': _iso(datetime.now(timezone.utc)),
    'users': {'total': counts['users_total']},
    'workouts': {'total': counts['workouts_total'], 'completed': counts['workouts_completed']},
    'exercises': {'total': counts['exercises_total']},
    'events': {
      'total': counts['events_total'],
      'published': counts['events_published'],
      'pending': counts['events_pending'],
      # events that have failed to publish at least once, including ones a retry later delivered
      'failed_attempts': counts['events_with_failed_attempts'],
    },
    'recent_activity': [
      {'workout_session_id': str(row['id']), 'user_id': str(row['user_id']), 'completed_at': _iso(row['completed_at'])}
      for row in recent
    ],
  }
