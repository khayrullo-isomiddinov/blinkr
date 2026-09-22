-- Additive and idempotent. Images are self-hosted copies of wger.de exercise photos (CC-BY-SA 4.0),
-- kept in S3 rather than hotlinked, with attribution stored alongside each row.
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS image_attribution TEXT;
