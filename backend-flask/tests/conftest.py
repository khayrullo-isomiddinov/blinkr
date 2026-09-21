import pytest

from lib.db import query_array_json


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
