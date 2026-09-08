-- this file was manually created

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL,
  cognito_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);

CREATE TABLE public.activities (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uuid UUID NOT NULL REFERENCES public.users(uuid),
  message TEXT NOT NULL,
  replies_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  reply_to_activity_uuid UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT current_timestamp NOT NULL
);
