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
def make_teams(db_available):
  """
  Creates a pair of throwaway teams per test (unique abbreviation so parallel
  test runs don't collide), and deletes them on teardown.
  """
  created_uuids = []

  def _make():
    suffix = uuid.uuid4().hex[:6].upper()
    home = execute(
      "INSERT INTO public.teams (name, short_name, abbreviation, country) "
      "VALUES (%s, %s, %s, %s) RETURNING uuid",
      (f"Test Home {suffix}", f"Home {suffix}", f"TH{suffix[:3]}", "Testland")
    )
    away = execute(
      "INSERT INTO public.teams (name, short_name, abbreviation, country) "
      "VALUES (%s, %s, %s, %s) RETURNING uuid",
      (f"Test Away {suffix}", f"Away {suffix}", f"TA{suffix[:3]}", "Testland")
    )
    created_uuids.extend([home['uuid'], away['uuid']])
    return home['uuid'], away['uuid']

  yield _make

  for team_uuid in created_uuids:
    execute("DELETE FROM public.teams WHERE uuid = %s", (team_uuid,))


@pytest.fixture
def make_match(make_teams):
  """
  Creates a throwaway match (and its two teams) per test. Deleting the match
  cascades to its match_events/match_reactions/user_followed_matches rows.
  """
  created_uuids = []

  def _make(status='live', kickoff_offset_minutes=-30, home_score=0, away_score=0):
    home_uuid, away_uuid = make_teams()
    row = execute(
      """
      INSERT INTO public.matches
        (home_team_uuid, away_team_uuid, competition, kickoff_time, status, home_score, away_score)
      VALUES
        (%s, %s, 'Test Cup', current_timestamp + (%s || ' minutes')::interval, %s, %s, %s)
      RETURNING uuid, home_team_uuid, away_team_uuid, status
      """,
      (home_uuid, away_uuid, kickoff_offset_minutes, status, home_score, away_score)
    )
    created_uuids.append(row['uuid'])
    return row

  yield _make

  for match_uuid in created_uuids:
    execute("DELETE FROM public.matches WHERE uuid = %s", (match_uuid,))
