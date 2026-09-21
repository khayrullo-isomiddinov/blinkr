import uuid

import pytest

from lib.db import execute
from repositories.create_exercise import CreateExercise
from repositories.show_exercise import ShowExercise
from repositories.exercises import Exercises
from repositories.create_workout_session import CreateWorkoutSession
from repositories.show_workout_session import ShowWorkoutSession
from repositories.workout_sessions import WorkoutSessions
from repositories.complete_workout_session import CompleteWorkoutSession
from repositories.create_session_exercise import CreateSessionExercise
from repositories.session_exercises import SessionExercises
from repositories.create_set import CreateSet
from repositories.sets import Sets

NO_SUCH_UUID = '00000000-0000-0000-0000-000000000000'


@pytest.fixture
def repo_exercise(db_available):
  """An exercise created (and cleaned up) through the repository layer itself."""
  created_ids = []

  def _make(muscle_group='chest', equipment='barbell'):
    name = f"Repo Test Exercise {uuid.uuid4().hex[:8]}"
    row = CreateExercise.run(name, muscle_group, equipment)
    created_ids.append(row['id'])
    return row

  yield _make

  for exercise_id in created_ids:
    execute("DELETE FROM public.exercises WHERE id = %s", (exercise_id,))


@pytest.fixture
def repo_session(db_available):
  """A workout session created (and cleaned up) through the repository layer itself."""
  created_ids = []

  def _make(user_uuid, notes=None):
    row = CreateWorkoutSession.run(user_uuid, notes=notes)
    created_ids.append(row['id'])
    return row

  yield _make

  for session_id in created_ids:
    execute("DELETE FROM public.workout_sessions WHERE id = %s", (session_id,))


@pytest.fixture
def repo_session_exercise(db_available):
  """
  A session_exercise created (and cleaned up) through the repository layer
  itself. Deletes the row directly at teardown rather than relying on a
  parent's CASCADE, so it's safe regardless of fixture teardown order
  relative to repo_session/repo_exercise.
  """
  created_ids = []

  def _make(session_id, exercise_id, exercise_order=1, notes=None):
    row = CreateSessionExercise.run(session_id, exercise_id, exercise_order, notes)
    created_ids.append(row['id'])
    return row

  yield _make

  for session_exercise_id in created_ids:
    execute("DELETE FROM public.session_exercises WHERE id = %s", (session_exercise_id,))


def test_create_show_and_list_exercise(repo_exercise):
  created = repo_exercise(muscle_group='back', equipment='pull-up bar')
  assert created['id'] is not None
  assert created['muscle_group'] == 'back'

  fetched = ShowExercise.run(created['id'])
  assert fetched['id'] == created['id']
  assert ShowExercise.run(NO_SUCH_UUID) is None

  all_exercises = Exercises.run()
  assert any(row['id'] == created['id'] for row in all_exercises)


def test_create_workout_session_for_user(demo_user, repo_session):
  session = repo_session(demo_user['uuid'], notes='leg day')
  assert session['user_id'] == demo_user['uuid']
  assert session['completed_at'] is None
  assert session['notes'] == 'leg day'


def test_list_returns_only_that_users_sessions(demo_user, other_user, repo_session):
  mine = repo_session(demo_user['uuid'])
  theirs = repo_session(other_user['uuid'])

  mine_sessions = WorkoutSessions.run(demo_user['uuid'])
  mine_ids = {row['id'] for row in mine_sessions}
  assert mine['id'] in mine_ids
  assert theirs['id'] not in mine_ids


def test_complete_workout_session_scoped_to_owner(demo_user, other_user, repo_session):
  session = repo_session(demo_user['uuid'])

  assert CompleteWorkoutSession.run(session['id'], other_user['uuid']) is None

  updated = CompleteWorkoutSession.run(session['id'], demo_user['uuid'])
  assert updated['id'] == session['id']
  assert updated['completed_at'] is not None


def test_add_exercise_to_session(demo_user, repo_session, repo_exercise, repo_session_exercise):
  session = repo_session(demo_user['uuid'])
  exercise = repo_exercise()

  repo_session_exercise(session['id'], exercise['id'], exercise_order=1)

  rows = SessionExercises.run(session['id'])
  assert len(rows) == 1
  assert rows[0]['exercise_id'] == exercise['id']
  assert rows[0]['exercise_name'] == exercise['name']


def test_add_multiple_sets_to_session_exercise(demo_user, repo_session, repo_exercise, repo_session_exercise):
  session = repo_session(demo_user['uuid'])
  exercise = repo_exercise()
  session_exercise = repo_session_exercise(session['id'], exercise['id'], exercise_order=1)

  CreateSet.run(session_exercise['id'], set_order=1, reps=10, weight=60, weight_unit='kg')
  CreateSet.run(session_exercise['id'], set_order=2, reps=8, weight=65, weight_unit='kg')

  rows = Sets.run(session_exercise['id'])
  assert [row['set_order'] for row in rows] == [1, 2]
  assert [row['reps'] for row in rows] == [10, 8]


def test_retrieve_complete_session_hierarchy(demo_user, repo_session, repo_exercise, repo_session_exercise):
  session = repo_session(demo_user['uuid'])
  exercise_a = repo_exercise()
  exercise_b = repo_exercise()

  session_exercise_a = repo_session_exercise(session['id'], exercise_a['id'], exercise_order=1)
  session_exercise_b = repo_session_exercise(session['id'], exercise_b['id'], exercise_order=2)
  CreateSet.run(session_exercise_a['id'], set_order=1, reps=12)
  CreateSet.run(session_exercise_a['id'], set_order=2, reps=10)
  CreateSet.run(session_exercise_b['id'], set_order=1, reps=15)

  hierarchy = ShowWorkoutSession.run(session['id'], demo_user['uuid'])
  assert hierarchy['id'] == session['id']
  assert [se['exercise_id'] for se in hierarchy['session_exercises']] == [exercise_a['id'], exercise_b['id']]
  assert len(hierarchy['session_exercises'][0]['sets']) == 2
  assert len(hierarchy['session_exercises'][1]['sets']) == 1

  # not visible to a different/unknown user_id
  assert ShowWorkoutSession.run(session['id'], NO_SUCH_UUID) is None
