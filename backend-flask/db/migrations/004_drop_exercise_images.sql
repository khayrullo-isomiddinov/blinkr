-- Reverts 003_exercise_images.sql. Exercise illustrations are now a vendored npm package
-- bundled into the frontend and matched by name client-side, not a per-row DB/S3 URL.
ALTER TABLE public.exercises DROP COLUMN IF EXISTS image_url;
ALTER TABLE public.exercises DROP COLUMN IF EXISTS image_attribution;
