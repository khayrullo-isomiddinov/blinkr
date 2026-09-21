from datetime import datetime, timezone


def compute_elapsed_minute(kickoff_time, status):
  """
  Derives the current match minute from wall-clock time -- never stored,
  always computed on read. Returns None for matches that aren't in progress.
  """
  if status not in ('live', 'half_time'):
    return None
  if isinstance(kickoff_time, str):
    kickoff_time = datetime.fromisoformat(kickoff_time)
  now = datetime.now(timezone.utc)
  elapsed = int((now - kickoff_time).total_seconds() // 60)
  return max(elapsed, 0)
