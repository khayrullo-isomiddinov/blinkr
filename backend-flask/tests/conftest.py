import uuid

import pytest

from lib.db import execute, query_array_json


@pytest.fixture(scope="session")
def db_available():
  """
  Most of this suite needs the local docker-compose Postgres container (the
  project has no ORM/mocking layer to fall back on -- lib/db.py talks raw SQL
  over a real connection). Skip with a clear message instead of failing with
  a confusing connection error if it's not up.
  """
  try:
    query_array_json("SELECT 1")
  except Exception as e:
    pytest.skip(f"Postgres not reachable (is `docker compose up -d` running + schema loaded?): {e}")
  return True


@pytest.fixture
def demo_user(db_available):
  """The 'andrewbrown' user inserted by db/seed.sql."""
  rows = query_array_json("SELECT uuid, handle FROM public.users WHERE handle = 'andrewbrown'")
  if not rows:
    pytest.skip("seed data not loaded (run ./bin/db-seed)")
  return rows[0]


@pytest.fixture
def other_user(db_available):
  """The 'khayrullo' user inserted by db/seed.sql."""
  rows = query_array_json("SELECT uuid, handle FROM public.users WHERE handle = 'khayrullo'")
  if not rows:
    pytest.skip("seed data not loaded (run ./bin/db-seed)")
  return rows[0]


@pytest.fixture
def make_exercise(db_available):
  """
  Creates a throwaway exercise per call (unique name so parallel test runs
  don't collide with the UNIQUE index on name), and deletes it on teardown.
  """
  created_ids = []

  def _make(name=None, muscle_group='chest', equipment='barbell'):
    suffix = uuid.uuid4().hex[:8]
    exercise_name = f"{name} {suffix}" if name else f"Test Exercise {suffix}"
    row = execute(
      "INSERT INTO public.exercises (name, muscle_group, equipment) "
      "VALUES (%s, %s, %s) RETURNING id",
      (exercise_name, muscle_group, equipment)
    )
    created_ids.append(row['id'])
    return row['id']

  yield _make

  for exercise_id in created_ids:
    execute("DELETE FROM public.exercises WHERE id = %s", (exercise_id,))


@pytest.fixture
def make_workout_session(db_available):
  """
  Creates a throwaway workout session per call, and deletes it on teardown
  (cascades to any session_exercises/sets created under it).
  """
  created_ids = []

  def _make(user_uuid, started_offset_minutes=-30, completed_at=None, notes=None):
    row = execute(
      "INSERT INTO public.workout_sessions (user_id, started_at, completed_at, notes) "
      "VALUES (%s, current_timestamp + (%s || ' minutes')::interval, %s, %s) "
      "RETURNING id",
      (user_uuid, started_offset_minutes, completed_at, notes)
    )
    created_ids.append(row['id'])
    return row['id']

  yield _make

  for session_id in created_ids:
    execute("DELETE FROM public.workout_sessions WHERE id = %s", (session_id,))


@pytest.fixture
def make_session_exercise(db_available):
  """
  Creates a throwaway session_exercise per call, and deletes it on teardown.
  """
  created_ids = []

  def _make(session_id, exercise_id, exercise_order=1, notes=None):
    row = execute(
      "INSERT INTO public.session_exercises (session_id, exercise_id, exercise_order, notes) "
      "VALUES (%s, %s, %s, %s) RETURNING id",
      (session_id, exercise_id, exercise_order, notes)
    )
    created_ids.append(row['id'])
    return row['id']

  yield _make

  for session_exercise_id in created_ids:
    execute("DELETE FROM public.session_exercises WHERE id = %s", (session_exercise_id,))


@pytest.fixture
def make_set(db_available):
  """
  Creates a throwaway set per call, and deletes it on teardown.
  """
  created_ids = []

  def _make(session_exercise_id, set_order=1, reps=10, weight=None, weight_unit=None, set_type='working'):
    row = execute(
      "INSERT INTO public.sets (session_exercise_id, set_order, reps, weight, weight_unit, set_type) "
      "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
      (session_exercise_id, set_order, reps, weight, weight_unit, set_type)
    )
    created_ids.append(row['id'])
    return row['id']

  yield _make

  for set_id in created_ids:
    execute("DELETE FROM public.sets WHERE id = %s", (set_id,))
