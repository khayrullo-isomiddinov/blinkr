import uuid

import psycopg2
from flask import Blueprint, request

from repositories.create_exercise import CreateExercise
from repositories.show_exercise import ShowExercise
from repositories.exercises import Exercises


def register_exercise_routes(app):
  bp = Blueprint('exercises', __name__)

  @bp.route('/api/exercises', methods=['GET'])
  def data_exercises():
    return Exercises.run(), 200

  @bp.route('/api/exercises/<string:exercise_id>', methods=['GET'])
  def data_show_exercise(exercise_id):
    try:
      uuid.UUID(exercise_id)
    except ValueError:
      return {'errors': ['exercise_not_found']}, 404

    exercise = ShowExercise.run(exercise_id)
    if exercise is None:
      return {'errors': ['exercise_not_found']}, 404
    return exercise, 200

  @bp.route('/api/exercises', methods=['POST'])
  def data_create_exercise():
    body = request.get_json(silent=True) or {}
    name = body.get('name')
    muscle_group = body.get('muscle_group')
    equipment = body.get('equipment')

    errors = []
    if not name:
      errors.append('name_blank')
    if not muscle_group:
      errors.append('muscle_group_blank')
    if errors:
      return errors, 422

    try:
      exercise = CreateExercise.run(name, muscle_group, equipment)
    except psycopg2.errors.UniqueViolation:
      return ['exercise_name_taken'], 409

    return exercise, 201

  app.register_blueprint(bp)
