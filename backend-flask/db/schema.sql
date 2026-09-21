-- this file was manually created

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  cognito_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
