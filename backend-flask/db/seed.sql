-- this file was manually created
-- test data, seeded manually into the local database only

INSERT INTO public.users (display_name, handle, cognito_user_id)
VALUES
  ('Andrew Brown', 'andrewbrown', 'MOCK'),
  ('Khayrullo Isomiddinov', 'khayrullo', 'MOCK');

INSERT INTO public.exercises (name, muscle_group, equipment)
VALUES
  ('Barbell Bench Press', 'chest', 'barbell'),
  ('Incline Dumbbell Press', 'chest', 'dumbbell'),
  ('Barbell Back Squat', 'legs', 'barbell'),
  ('Romanian Deadlift', 'legs', 'barbell'),
  ('Conventional Deadlift', 'back', 'barbell'),
  ('Pull-Up', 'back', 'pull-up bar'),
  ('Barbell Row', 'back', 'barbell'),
  ('Overhead Press', 'shoulders', 'barbell'),
  ('Lateral Raise', 'shoulders', 'dumbbell'),
  ('Barbell Curl', 'arms', 'barbell'),
  ('Triceps Pushdown', 'arms', 'cable'),
  ('Plank', 'core', NULL)
ON CONFLICT (name) DO NOTHING;

-- Additional exercises named in the "Plate Precision Strength" UI reference designs (ui sources - to be deleted/),
-- so the app shows the same real movements those mockups did. Additive; safe to re-run.
INSERT INTO public.exercises (name, muscle_group, equipment)
VALUES
  ('Pendlay Barbell Row', 'back', 'barbell'),
  ('Weighted Dips', 'chest', 'dip bar'),
  ('Incline Dumbbell Curl', 'arms', 'dumbbell'),
  ('Weighted Pull-Up', 'back', 'pull-up bar'),
  ('Chest Supported Row', 'back', 'dumbbell'),
  ('Single-Arm Cable Lat Pulldown', 'back', 'cable'),
  ('Hammer Rope Pulley Curl', 'arms', 'cable'),
  ('Flat Dumbbell Press', 'chest', 'dumbbell'),
  ('Barbell Seal Row', 'back', 'barbell'),
  ('Cable Pec Crossover', 'chest', 'cable'),
  ('Overhead Rope Extension', 'arms', 'cable'),
  ('Standing Overhead Press', 'shoulders', 'barbell'),
  ('Safety Bar Squat', 'legs', 'safety squat bar'),
  ('Hack Squat', 'legs', 'machine'),
  ('Leg Extension', 'legs', 'machine'),
  ('Seated Calf Raise', 'legs', 'machine'),
  ('Seated Leg Curl', 'legs', 'machine'),
  ('Preacher Barbell Curl', 'arms', 'barbell'),
  ('Cross-Body Triceps Extension', 'arms', 'dumbbell')
ON CONFLICT (name) DO NOTHING;

-- A starter training week for the local 'khayrullo' demo user, so /calendar and /plan aren't empty on first run.
-- Weekday convention: 0 = Monday ... 6 = Sunday. Local seed only -- never run against production.
DO $$
DECLARE
  v_user UUID;
  v_plan UUID;
  v_workout UUID;
BEGIN
  SELECT uuid INTO v_user FROM public.users WHERE handle = 'khayrullo';
  IF v_user IS NULL OR EXISTS (SELECT 1 FROM public.training_plans WHERE user_id = v_user) THEN
    RETURN;
  END IF;

  INSERT INTO public.training_plans (user_id, name) VALUES (v_user, 'My week') RETURNING id INTO v_plan;

  -- Monday: Push Volume
  INSERT INTO public.planned_workouts (training_plan_id, weekday, name) VALUES (v_plan, 0, 'Push Volume') RETURNING id INTO v_workout;
  INSERT INTO public.planned_exercises (planned_workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit)
  SELECT v_workout, id, o, s::int, rmin::int, rmax::int, w::numeric, u::text FROM (VALUES
    ('Barbell Bench Press', 1, 4, 6, 8, 100, 'kg'),
    ('Weighted Dips', 2, 4, 8, 10, NULL, NULL),
    ('Lateral Raise', 3, 4, 12, 15, NULL, NULL),
    ('Triceps Pushdown', 4, 3, 10, 12, NULL, NULL)
  ) AS x(name, o, s, rmin, rmax, w, u) JOIN public.exercises e ON e.name = x.name;

  -- Tuesday: Pull Strength
  INSERT INTO public.planned_workouts (training_plan_id, weekday, name) VALUES (v_plan, 1, 'Pull Strength') RETURNING id INTO v_workout;
  INSERT INTO public.planned_exercises (planned_workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit)
  SELECT v_workout, id, o, s::int, rmin::int, rmax::int, w::numeric, u::text FROM (VALUES
    ('Pendlay Barbell Row', 1, 4, 6, 8, 85, 'kg'),
    ('Chest Supported Row', 2, 4, 8, NULL, NULL, NULL),
    ('Single-Arm Cable Lat Pulldown', 3, 3, 12, NULL, NULL, NULL),
    ('Incline Dumbbell Curl', 4, 4, 10, NULL, 18, 'kg')
  ) AS x(name, o, s, rmin, rmax, w, u) JOIN public.exercises e ON e.name = x.name;

  -- Wednesday: rest (no row)

  -- Thursday: Upper Intensity
  INSERT INTO public.planned_workouts (training_plan_id, weekday, name) VALUES (v_plan, 3, 'Upper Intensity') RETURNING id INTO v_workout;
  INSERT INTO public.planned_exercises (planned_workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit)
  SELECT v_workout, id, o, s::int, rmin::int, rmax::int, w::numeric, u::text FROM (VALUES
    ('Standing Overhead Press', 1, 3, 8, 10, 62.5, 'kg'),
    ('Flat Dumbbell Press', 2, 4, 6, NULL, NULL, NULL),
    ('Cable Pec Crossover', 3, 3, 12, NULL, NULL, NULL),
    ('Overhead Rope Extension', 4, 3, 12, NULL, NULL, NULL)
  ) AS x(name, o, s, rmin, rmax, w, u) JOIN public.exercises e ON e.name = x.name;

  -- Friday: Legs Anterior
  INSERT INTO public.planned_workouts (training_plan_id, weekday, name) VALUES (v_plan, 4, 'Legs Anterior') RETURNING id INTO v_workout;
  INSERT INTO public.planned_exercises (planned_workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit)
  SELECT v_workout, id, o, s::int, rmin::int, rmax::int, w::numeric, u::text FROM (VALUES
    ('Safety Bar Squat', 1, 4, 6, NULL, NULL, NULL),
    ('Hack Squat', 2, 4, 10, NULL, NULL, NULL),
    ('Leg Extension', 3, 4, 12, NULL, NULL, NULL),
    ('Seated Calf Raise', 4, 3, 15, NULL, NULL, NULL)
  ) AS x(name, o, s, rmin, rmax, w, u) JOIN public.exercises e ON e.name = x.name;

  -- Saturday: Posterior Chain
  INSERT INTO public.planned_workouts (training_plan_id, weekday, name) VALUES (v_plan, 5, 'Posterior Chain') RETURNING id INTO v_workout;
  INSERT INTO public.planned_exercises (planned_workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit)
  SELECT v_workout, id, o, s::int, rmin::int, rmax::int, w::numeric, u::text FROM (VALUES
    ('Romanian Deadlift', 1, 4, 8, NULL, NULL, NULL),
    ('Seated Leg Curl', 2, 4, 10, NULL, NULL, NULL),
    ('Preacher Barbell Curl', 3, 3, 10, NULL, NULL, NULL),
    ('Cross-Body Triceps Extension', 4, 3, 12, NULL, NULL, NULL)
  ) AS x(name, o, s, rmin, rmax, w, u) JOIN public.exercises e ON e.name = x.name;

  -- Sunday: rest (no row)
END $$;
