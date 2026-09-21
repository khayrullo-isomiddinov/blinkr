import uuid

import psycopg2

from lib.db import transaction
from repositories.training_plan import TrainingPlan
from repositories.create_training_plan import CreateTrainingPlan
from repositories.rename_training_plan import RenameTrainingPlan
from repositories.delete_training_plan import DeleteTrainingPlan
from repositories.planned_workouts import PlannedWorkouts
from repositories.show_planned_workout import ShowPlannedWorkout
from repositories.create_planned_workout import CreatePlannedWorkout
from repositories.update_planned_workout import UpdatePlannedWorkout
from repositories.delete_planned_workout import DeletePlannedWorkout
from repositories.delete_planned_workout_on_weekday import DeletePlannedWorkoutOnWeekday
from repositories.replace_planned_exercises import ReplacePlannedExercises

# Weekday convention, everywhere in Blinkr: 0 = Monday ... 6 = Sunday (ISO weekday minus one).
# The frontend mirrors it in src/lib/calendar.js.
DEFAULT_PLAN_NAME = 'My week'
MAX_NAME = 60
MAX_NOTES = 500
MAX_EXERCISES = 30


class PlanningError(Exception):
  def __init__(self, codes, status):
    super().__init__(codes[0])
    self.codes = codes
    self.status = status


def _is_int(value):
  return isinstance(value, int) and not isinstance(value, bool)


def _is_number(value):
  return isinstance(value, (int, float)) and not isinstance(value, bool)


def _clean_name(value, errors, code='name_invalid'):
  if not isinstance(value, str) or not value.strip() or len(value.strip()) > MAX_NAME:
    errors.append(code)
    return None
  return value.strip()


def _clean_weekday(value, errors):
  if not _is_int(value) or not 0 <= value <= 6:
    errors.append('weekday_invalid')
    return None
  return value


def _clean_notes(value, errors):
  if value is None:
    return None
  if not isinstance(value, str) or len(value.strip()) > MAX_NOTES:
    errors.append('notes_invalid')
    return None
  return value.strip() or None


def _clean_exercise(item, errors):
  if not isinstance(item, dict):
    errors.append('exercises_invalid')
    return None

  exercise_id = item.get('exercise_id')
  try:
    uuid.UUID(exercise_id)
  except (ValueError, AttributeError, TypeError):
    errors.append('exercise_id_invalid')

  sets = item.get('target_sets', 3)
  if not _is_int(sets) or not 1 <= sets <= 20:
    errors.append('target_sets_invalid')

  reps_min, reps_max = item.get('target_reps_min'), item.get('target_reps_max')
  for reps in (reps_min, reps_max):
    if reps is not None and (not _is_int(reps) or not 1 <= reps <= 100):
      errors.append('target_reps_invalid')
  if reps_max is not None and reps_min is None:
    errors.append('target_reps_invalid')
  if _is_int(reps_min) and _is_int(reps_max):
    if reps_max < reps_min:
      errors.append('target_reps_invalid')
    elif reps_max == reps_min:
      reps_max = None  # "8-8" is just 8

  weight, unit = item.get('target_weight'), item.get('target_weight_unit')
  if weight is not None and (not _is_number(weight) or not 0 <= weight <= 2000):
    errors.append('target_weight_invalid')
  if unit is not None and unit not in ('kg', 'lb'):
    errors.append('target_weight_unit_invalid')
  if weight is not None and unit is None:
    errors.append('target_weight_unit_required')
  if weight is None:
    unit = None

  notes = _clean_notes(item.get('notes'), errors)
  return {
    'exercise_id': exercise_id, 'target_sets': sets, 'target_reps_min': reps_min, 'target_reps_max': reps_max,
    'target_weight': weight, 'target_weight_unit': unit, 'notes': notes,
  }


def _clean_exercises(items, errors):
  if not isinstance(items, list):
    errors.append('exercises_invalid')
    return None
  if len(items) > MAX_EXERCISES:
    errors.append('too_many_exercises')
    return None
  return [_clean_exercise(item, errors) for item in items]


def _fail_if(errors):
  if errors:
    raise PlanningError(list(dict.fromkeys(errors)), 422)


def _workout_or_404(user_id, workout_id, conn=None):
  try:
    uuid.UUID(workout_id)
  except (ValueError, TypeError):
    raise PlanningError(['planned_workout_not_found'], 404)
  workout = ShowPlannedWorkout.run(user_id, workout_id, conn=conn)
  if workout is None:
    raise PlanningError(['planned_workout_not_found'], 404)
  return workout


def _ensure_plan(user_id, conn):
  plan = TrainingPlan.run(user_id, conn=conn) or CreateTrainingPlan.run(user_id, DEFAULT_PLAN_NAME, conn=conn)
  return plan or TrainingPlan.run(user_id, conn=conn)


def get_plan(user_id):
  plan = TrainingPlan.run(user_id)
  if plan is None:
    return None
  plan['workouts'] = PlannedWorkouts.run(plan['id'])
  return plan


def create_plan(user_id, name):
  errors = []
  name = _clean_name(name if name is not None else DEFAULT_PLAN_NAME, errors)
  _fail_if(errors)
  plan = CreateTrainingPlan.run(user_id, name)
  if plan is None:
    raise PlanningError(['plan_exists'], 409)
  plan['workouts'] = []
  return plan


def rename_plan(user_id, name):
  errors = []
  name = _clean_name(name, errors)
  _fail_if(errors)
  plan = RenameTrainingPlan.run(user_id, name)
  if plan is None:
    raise PlanningError(['plan_not_found'], 404)
  return get_plan(user_id)


def delete_plan(user_id):
  if DeleteTrainingPlan.run(user_id) is None:
    raise PlanningError(['plan_not_found'], 404)


def create_workout(user_id, body):
  errors = []
  weekday = _clean_weekday(body.get('weekday'), errors)
  name = _clean_name(body.get('name'), errors)
  notes = _clean_notes(body.get('notes'), errors)
  exercises = _clean_exercises(body.get('exercises', []), errors)
  _fail_if(errors)

  try:
    with transaction() as conn:
      plan = _ensure_plan(user_id, conn)
      workout = CreatePlannedWorkout.run(plan['id'], weekday, name, notes, conn=conn)
      ReplacePlannedExercises.run(workout['id'], exercises, conn=conn)
  except psycopg2.errors.UniqueViolation:
    raise PlanningError(['weekday_taken'], 409)
  except psycopg2.errors.ForeignKeyViolation:
    raise PlanningError(['exercise_not_found'], 404)
  return ShowPlannedWorkout.run(user_id, workout['id'])


def update_workout(user_id, workout_id, body):
  errors, changes = [], {}
  if 'name' in body:
    changes['name'] = _clean_name(body['name'], errors)
  if 'weekday' in body:
    changes['weekday'] = _clean_weekday(body['weekday'], errors)
  if 'notes' in body:
    changes['notes'] = _clean_notes(body['notes'], errors)
  exercises = _clean_exercises(body['exercises'], errors) if 'exercises' in body else None
  _fail_if(errors)

  try:
    with transaction() as conn:
      _workout_or_404(user_id, workout_id, conn=conn)
      UpdatePlannedWorkout.run(user_id, workout_id, changes, conn=conn)
      if exercises is not None:
        ReplacePlannedExercises.run(workout_id, exercises, conn=conn)
  except psycopg2.errors.UniqueViolation:
    raise PlanningError(['weekday_taken'], 409)
  except psycopg2.errors.ForeignKeyViolation:
    raise PlanningError(['exercise_not_found'], 404)
  return ShowPlannedWorkout.run(user_id, workout_id)


def replace_exercises(user_id, workout_id, body):
  return update_workout(user_id, workout_id, {'exercises': body.get('exercises')})


def delete_workout(user_id, workout_id):
  _workout_or_404(user_id, workout_id)
  DeletePlannedWorkout.run(user_id, workout_id)


def duplicate_workout(user_id, workout_id, body):
  source = _workout_or_404(user_id, workout_id)
  errors = []
  weekday = _clean_weekday(body.get('weekday'), errors)
  name = _clean_name(body['name'], errors) if 'name' in body else source['name']
  _fail_if(errors)
  if weekday == source['weekday']:
    raise PlanningError(['weekday_taken'], 409)

  try:
    with transaction() as conn:
      if body.get('replace') is True:
        DeletePlannedWorkoutOnWeekday.run(source['training_plan_id'], weekday, conn=conn)
      copy = CreatePlannedWorkout.run(source['training_plan_id'], weekday, name, source['notes'], conn=conn)
      ReplacePlannedExercises.run(copy['id'], source['exercises'], conn=conn)
  except psycopg2.errors.UniqueViolation:
    raise PlanningError(['weekday_taken'], 409)
  return ShowPlannedWorkout.run(user_id, copy['id'])
