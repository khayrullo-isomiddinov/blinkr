import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

EVENT_TYPE = 'workout.session.completed'


@dataclass(frozen=True)
class WorkoutSessionCompleted:
  user_id: str
  workout_session_id: str
  event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
  event_type: str = EVENT_TYPE
  occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

  def to_json(self):
    # The stable wire representation -- explicit field list rather than a
    # generic dataclass/asdict dump, so the contract doesn't shift if fields
    # are reordered or new ones are added later.
    return json.dumps({
      'event_id': self.event_id,
      'event_type': self.event_type,
      'occurred_at': self.occurred_at.isoformat(),
      'user_id': self.user_id,
      'workout_session_id': self.workout_session_id,
    })
