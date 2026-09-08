-- this file was manually created
-- test data, seeded manually into the local database only

INSERT INTO public.users (display_name, handle, cognito_user_id)
VALUES
  ('Andrew Brown', 'andrewbrown', 'MOCK'),
  ('Khayrullo Isomiddinov', 'khayrullo', 'MOCK');

INSERT INTO public.activities (user_uuid, message, expires_at)
VALUES
  (
    (SELECT uuid FROM public.users WHERE handle = 'andrewbrown' LIMIT 1),
    'This was imported as seed data!',
    current_timestamp + interval '10 day'
  ),
  (
    (SELECT uuid FROM public.users WHERE handle = 'khayrullo' LIMIT 1),
    'Testing out the new local Postgres schema!',
    current_timestamp + interval '10 day'
  );
