-- this file was manually created

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.user_followed_matches CASCADE;
DROP TABLE IF EXISTS public.user_followed_teams CASCADE;
DROP TABLE IF EXISTS public.match_reactions CASCADE;
DROP TABLE IF EXISTS public.match_events CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  cognito_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);

CREATE TABLE public.teams (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
CREATE UNIQUE INDEX idx_teams_abbreviation ON public.teams (abbreviation);

CREATE TABLE public.matches (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_team_uuid UUID NOT NULL REFERENCES public.teams(uuid),
  away_team_uuid UUID NOT NULL REFERENCES public.teams(uuid),
  competition TEXT NOT NULL DEFAULT 'Friendly',
  kickoff_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'half_time', 'finished')),
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  CONSTRAINT chk_matches_distinct_teams CHECK (home_team_uuid <> away_team_uuid)
);
CREATE INDEX idx_matches_status ON public.matches (status);
CREATE INDEX idx_matches_kickoff_time ON public.matches (kickoff_time);
-- Covers the live/upcoming list queries (filter by status, sorted by kickoff_time)
-- with a single index instead of combining the two single-column ones above.
CREATE INDEX idx_matches_status_kickoff ON public.matches (status, kickoff_time);

CREATE TABLE public.match_events (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_uuid UUID NOT NULL REFERENCES public.matches(uuid) ON DELETE CASCADE,
  team_uuid UUID REFERENCES public.teams(uuid),
  event_type TEXT NOT NULL
    CHECK (event_type IN ('GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'HALF_TIME', 'FULL_TIME')),
  minute INTEGER NOT NULL,
  player_name TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
CREATE INDEX idx_match_events_match_uuid ON public.match_events (match_uuid, minute);

CREATE TABLE public.match_reactions (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_uuid UUID NOT NULL REFERENCES public.matches(uuid) ON DELETE CASCADE,
  user_uuid UUID NOT NULL REFERENCES public.users(uuid),
  message TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
CREATE INDEX idx_match_reactions_match_uuid ON public.match_reactions (match_uuid, created_at);
CREATE INDEX idx_match_reactions_expires_at ON public.match_reactions (expires_at);

CREATE TABLE public.user_followed_teams (
  user_uuid UUID NOT NULL REFERENCES public.users(uuid) ON DELETE CASCADE,
  team_uuid UUID NOT NULL REFERENCES public.teams(uuid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  PRIMARY KEY (user_uuid, team_uuid)
);

CREATE TABLE public.user_followed_matches (
  user_uuid UUID NOT NULL REFERENCES public.users(uuid) ON DELETE CASCADE,
  match_uuid UUID NOT NULL REFERENCES public.matches(uuid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL,
  PRIMARY KEY (user_uuid, match_uuid)
);
