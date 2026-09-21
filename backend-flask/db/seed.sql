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
