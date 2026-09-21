from lib.db import transaction
from repositories.show_workout_session import ShowWorkoutSession
from repositories.complete_workout_session import CompleteWorkoutSession
from repositories.create_outbox_event import CreateOutboxEvent
from events.workout_session_completed import WorkoutSessionCompleted


class CompleteWorkoutSessionAndRecordEvent:
  # Marks the session completed and records its WorkoutSessionCompleted
  # event in the outbox in the SAME database transaction -- either both
  # happen or neither does. This does NOT publish to SQS: a separate
  # OutboxPublisher (application/outbox_publisher.py) picks up unpublished
  # outbox rows independently, so completion no longer depends on SQS being
  # reachable at all.
  #
  # Records exactly one event per session: the repository itself still
  # allows re-completing an already-completed session unchanged, but a
  # repeat isn't a new completion from a domain-event point of view, so no
  # second outbox row is written for it (nothing to make transactional with
  # in that case, since there's no new event).
  def run(session_id, user_id, completed_at=None, notes=None):
    existing = ShowWorkoutSession.run(session_id, user_id)
    if existing is None:
      return None

    if existing['completed_at'] is not None:
      return CompleteWorkoutSession.run(session_id, user_id, completed_at, notes)

    with transaction() as conn:
      session = CompleteWorkoutSession.run(session_id, user_id, completed_at, notes, conn=conn)
      if session is None:
        return None

      event = WorkoutSessionCompleted(user_id=session['user_id'], workout_session_id=session['id'])
      CreateOutboxEvent.run(event.event_id, event.event_type, event.to_json(), conn=conn)

    return session
