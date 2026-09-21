-- Additive and idempotent: safe to run on any database, any number of times.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar BYTEA;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_content_type TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;
