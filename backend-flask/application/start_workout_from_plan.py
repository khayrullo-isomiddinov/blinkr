import psycopg2

from lib.db import execute, query_array_json, transaction
from application.planning import PlanningError, _workout_or_404

SESSION_COLUMNS = 'id, user_id, started_at, completed_at, notes, planned_workout_id, plan_name, created_at'


class StartWorkoutFromPlan:
  # Copies the planned workout into a normal workout_session. Returns (session, created).
  # The copy is independent afterwards: later plan edits never touch the session.
  # A workout already in progress from the same plan is returned instead of starting a second one.
  def run(user_id, workout_id, started_at):
    if not started_at or not isinstance(started_at, str):
      raise PlanningError(['started_at_blank'], 422)
    planned = _workout_or_404(user_id, workout_id)

    open_sessions = query_array_json(
      f"""
      SELECT {SESSION_COLUMNS} FROM public.workout_sessions
      WHERE user_id = %s AND planned_workout_id = %s AND completed_at IS NULL
      ORDER BY started_at DESC LIMIT 1
      """,
      (user_id, planned['id'])
    )
    if open_sessions:
      return open_sessions[0], False

    try:
      with transaction() as conn:
        session = query_array_json(
          f"""
          INSERT INTO public.workout_sessions (user_id, started_at, planned_workout_id, plan_name)
          VALUES (%s, %s, %s, %s)
          RETURNING {SESSION_COLUMNS}
          """,
          (user_id, started_at, planned['id'], planned['name']), conn=conn
        )[0]
        execute(
          """
          INSERT INTO public.session_exercises (
            session_id, exercise_id, exercise_order, notes,
            target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit
          )
          SELECT %s, exercise_id, exercise_order, notes,
                 target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit
          FROM public.planned_exercises
          WHERE planned_workout_id = %s
          ORDER BY exercise_order
          """,
          (session['id'], planned['id']), conn=conn
        )
    except psycopg2.errors.DataError:
      raise PlanningError(['started_at_invalid'], 422)
    return session, True
