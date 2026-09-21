-- this file was manually created

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.sets CASCADE;
DROP TABLE IF EXISTS public.session_exercises CASCADE;
DROP TABLE IF EXISTS public.workout_sessions CASCADE;
DROP TABLE IF EXISTS public.planned_exercises CASCADE;
DROP TABLE IF EXISTS public.planned_workouts CASCADE;
DROP TABLE IF EXISTS public.training_plans CASCADE;
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.outbox_events CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  cognito_user_id TEXT NOT NULL,
  avatar BYTEA,
  avatar_content_type TEXT,
  avatar_updated_at TIMESTAMPTZ,
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

-- Training plans: one weekly plan per user. Weekday convention everywhere: 0 = Monday ... 6 = Sunday.
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(uuid) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My week',
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
CREATE UNIQUE INDEX idx_training_plans_user_id ON public.training_plans (user_id);

CREATE TABLE public.planned_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
CREATE UNIQUE INDEX idx_planned_workouts_plan_weekday ON public.planned_workouts (training_plan_id, weekday);

CREATE TABLE public.planned_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planned_workout_id UUID NOT NULL REFERENCES public.planned_workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  exercise_order INTEGER NOT NULL CHECK (exercise_order > 0),
  target_sets INTEGER NOT NULL DEFAULT 3 CHECK (target_sets BETWEEN 1 AND 20),
  target_reps_min INTEGER CHECK (target_reps_min BETWEEN 1 AND 100),
  target_reps_max INTEGER CHECK (target_reps_max BETWEEN 1 AND 100),
  target_weight NUMERIC CHECK (target_weight >= 0),
  target_weight_unit TEXT CHECK (target_weight_unit IN ('kg', 'lb')),
  notes TEXT,
  CONSTRAINT chk_planned_exercises_reps_range
    CHECK (target_reps_max IS NULL OR (target_reps_min IS NOT NULL AND target_reps_max > target_reps_min)),
  CONSTRAINT chk_planned_exercises_weight_unit
    CHECK (target_weight IS NULL OR target_weight_unit IS NOT NULL)
);
CREATE UNIQUE INDEX idx_planned_exercises_workout_order ON public.planned_exercises (planned_workout_id, exercise_order);
CREATE INDEX idx_planned_exercises_exercise_id ON public.planned_exercises (exercise_id);


CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(uuid),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  planned_workout_id UUID REFERENCES public.planned_workouts(id) ON DELETE SET NULL,
  plan_name TEXT,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  CONSTRAINT chk_workout_sessions_completed_after_started
    CHECK (completed_at IS NULL OR completed_at >= started_at)
);
CREATE INDEX idx_workout_sessions_user_id ON public.workout_sessions (user_id);
CREATE INDEX idx_workout_sessions_user_started ON public.workout_sessions (user_id, started_at);

CREATE TABLE public.session_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  exercise_order INTEGER NOT NULL CHECK (exercise_order > 0),
  notes TEXT,
  target_sets INTEGER,
  target_reps_min INTEGER,
  target_reps_max INTEGER,
  target_weight NUMERIC,
  target_weight_unit TEXT
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

-- Transactional outbox: written in the same DB transaction as the domain
-- change it records (e.g. a workout completion), so the two can never
-- diverge. Not tied by FK to any specific domain table -- generic across
-- whatever event types get recorded here, identified by event_type/payload.
CREATE TABLE public.outbox_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  published_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX idx_outbox_events_event_id ON public.outbox_events (event_id);
-- Partial index: only the unpublished subset is ever queried by the publisher.
CREATE INDEX idx_outbox_events_unpublished ON public.outbox_events (created_at) WHERE published_at IS NULL;
