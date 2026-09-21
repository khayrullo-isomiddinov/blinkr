import pytest

from lib.db import query_array_json, execute


def test_workout_tables_exist(db_available):
  rows = query_array_json(
    "SELECT table_name FROM information_schema.tables "
    "WHERE table_schema = 'public' AND table_name = ANY(%s)",
    (['exercises', 'workout_sessions', 'session_exercises', 'sets'],)
  )
  found = {row['table_name'] for row in rows}
  assert found == {'exercises', 'workout_sessions', 'session_exercises', 'sets'}


def test_workout_session_rejects_unknown_user(db_available):
  with pytest.raises(Exception):
    execute(
      "INSERT INTO public.workout_sessions (user_id, started_at) "
      "VALUES (%s, current_timestamp)",
      ('00000000-0000-0000-0000-000000000000',)
    )


def test_session_exercise_rejects_unknown_exercise(demo_user, make_workout_session):
  session_id = make_workout_session(demo_user['uuid'])
  with pytest.raises(Exception):
    execute(
      "INSERT INTO public.session_exercises (session_id, exercise_id, exercise_order) "
      "VALUES (%s, %s, 1)",
      (session_id, '00000000-0000-0000-0000-000000000000')
    )


def test_user_can_have_multiple_workout_sessions(demo_user, make_workout_session):
  session_a = make_workout_session(demo_user['uuid'])
  session_b = make_workout_session(demo_user['uuid'])

  rows = query_array_json(
    "SELECT id FROM public.workout_sessions WHERE user_id = %s", (demo_user['uuid'],)
  )
  ids = {row['id'] for row in rows}
  assert {session_a, session_b} <= ids


def test_session_can_contain_multiple_exercises(demo_user, make_workout_session, make_exercise, make_session_exercise):
  session_id = make_workout_session(demo_user['uuid'])
  exercise_a = make_exercise(name='Bench Press')
  exercise_b = make_exercise(name='Squat')
  make_session_exercise(session_id, exercise_a, exercise_order=1)
  make_session_exercise(session_id, exercise_b, exercise_order=2)

  rows = query_array_json(
    "SELECT exercise_id FROM public.session_exercises "
    "WHERE session_id = %s ORDER BY exercise_order",
    (session_id,)
  )
  assert [row['exercise_id'] for row in rows] == [exercise_a, exercise_b]


def test_exercise_can_appear_in_multiple_sessions(demo_user, make_workout_session, make_exercise, make_session_exercise):
  exercise_id = make_exercise(name='Deadlift')
  session_a = make_workout_session(demo_user['uuid'])
  session_b = make_workout_session(demo_user['uuid'])
  make_session_exercise(session_a, exercise_id, exercise_order=1)
  make_session_exercise(session_b, exercise_id, exercise_order=1)

  rows = query_array_json(
    "SELECT session_id FROM public.session_exercises WHERE exercise_id = %s",
    (exercise_id,)
  )
  session_ids = {row['session_id'] for row in rows}
  assert {session_a, session_b} <= session_ids


def test_session_exercise_can_contain_multiple_sets(
  demo_user, make_workout_session, make_exercise, make_session_exercise, make_set
):
  session_id = make_workout_session(demo_user['uuid'])
  exercise_id = make_exercise(name='Overhead Press')
  session_exercise_id = make_session_exercise(session_id, exercise_id, exercise_order=1)
  make_set(session_exercise_id, set_order=1, reps=10, weight=40, weight_unit='kg')
  make_set(session_exercise_id, set_order=2, reps=8, weight=45, weight_unit='kg')

  rows = query_array_json(
    "SELECT set_order FROM public.sets WHERE session_exercise_id = %s ORDER BY set_order",
    (session_exercise_id,)
  )
  assert [row['set_order'] for row in rows] == [1, 2]
