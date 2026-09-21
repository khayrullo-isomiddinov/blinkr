-- Additive and idempotent. Weekday convention everywhere: 0 = Monday ... 6 = Sunday.
CREATE TABLE IF NOT EXISTS public.training_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(uuid) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My week',
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_plans_user_id ON public.training_plans (user_id);

CREATE TABLE IF NOT EXISTS public.planned_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_workouts_plan_weekday ON public.planned_workouts (training_plan_id, weekday);

CREATE TABLE IF NOT EXISTS public.planned_exercises (
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_exercises_workout_order ON public.planned_exercises (planned_workout_id, exercise_order);
CREATE INDEX IF NOT EXISTS idx_planned_exercises_exercise_id ON public.planned_exercises (exercise_id);

-- A started workout keeps a copy of what was planned, so later plan edits never change it.
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS planned_workout_id UUID REFERENCES public.planned_workouts(id) ON DELETE SET NULL;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.session_exercises ADD COLUMN IF NOT EXISTS target_sets INTEGER;
ALTER TABLE public.session_exercises ADD COLUMN IF NOT EXISTS target_reps_min INTEGER;
ALTER TABLE public.session_exercises ADD COLUMN IF NOT EXISTS target_reps_max INTEGER;
ALTER TABLE public.session_exercises ADD COLUMN IF NOT EXISTS target_weight NUMERIC;
ALTER TABLE public.session_exercises ADD COLUMN IF NOT EXISTS target_weight_unit TEXT;
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started ON public.workout_sessions (user_id, started_at);
