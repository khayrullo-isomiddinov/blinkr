-- this file was manually created

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.sets CASCADE;
DROP TABLE IF EXISTS public.session_exercises CASCADE;
DROP TABLE IF EXISTS public.workout_sessions CASCADE;
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  cognito_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
CREATE UNIQUE INDEX idx_exercises_name ON public.exercises (name);

CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(uuid),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  CONSTRAINT chk_workout_sessions_completed_after_started
    CHECK (completed_at IS NULL OR completed_at >= started_at)
);
CREATE INDEX idx_workout_sessions_user_id ON public.workout_sessions (user_id);

CREATE TABLE public.session_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  exercise_order INTEGER NOT NULL CHECK (exercise_order > 0),
  notes TEXT
);
CREATE INDEX idx_session_exercises_exercise_id ON public.session_exercises (exercise_id);
CREATE UNIQUE INDEX idx_session_exercises_session_order ON public.session_exercises (session_id, exercise_order);

CREATE TABLE public.sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_exercise_id UUID NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  set_order INTEGER NOT NULL CHECK (set_order > 0),
  reps INTEGER NOT NULL CHECK (reps >= 0),
  weight NUMERIC,
  weight_unit TEXT CHECK (weight_unit IN ('kg', 'lb')),
  set_type TEXT NOT NULL DEFAULT 'working' CHECK (set_type IN ('warmup', 'working', 'drop', 'failure')),
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  CONSTRAINT chk_sets_weight_unit_with_weight
    CHECK (weight IS NULL OR weight_unit IS NOT NULL)
);
CREATE UNIQUE INDEX idx_sets_session_exercise_order ON public.sets (session_exercise_id, set_order);
