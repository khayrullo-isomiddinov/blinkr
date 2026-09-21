-- this file was manually created
-- test data, seeded manually into the local database only

INSERT INTO public.users (display_name, handle, cognito_user_id)
VALUES
  ('Andrew Brown', 'andrewbrown', 'MOCK'),
  ('Khayrullo Isomiddinov', 'khayrullo', 'MOCK'),
  ('Sarah', 'sarah', 'MOCK'),
  ('Alex', 'alex', 'MOCK');

INSERT INTO public.teams (name, short_name, abbreviation, country)
VALUES
  ('Real Madrid CF', 'Real Madrid', 'RMA', 'Spain'),
  ('FC Barcelona', 'Barcelona', 'BAR', 'Spain'),
  ('Manchester City FC', 'Man City', 'MCI', 'England'),
  ('Arsenal FC', 'Arsenal', 'ARS', 'England'),
  ('Liverpool FC', 'Liverpool', 'LIV', 'England'),
  ('Chelsea FC', 'Chelsea', 'CHE', 'England'),
  ('FC Bayern Munich', 'Bayern Munich', 'BAY', 'Germany'),
  ('Borussia Dortmund', 'Dortmund', 'BVB', 'Germany');

-- 1 live match: kickoff 65 minutes ago, currently in the 2nd half
INSERT INTO public.matches (home_team_uuid, away_team_uuid, competition, kickoff_time, status, home_score, away_score)
VALUES (
  (SELECT uuid FROM public.teams WHERE abbreviation = 'RMA'),
  (SELECT uuid FROM public.teams WHERE abbreviation = 'BAR'),
  'El Clasico',
  current_timestamp - interval '65 minutes',
  'live',
  1, 1
);

-- upcoming matches (future kickoff, scheduled)
INSERT INTO public.matches (home_team_uuid, away_team_uuid, competition, kickoff_time, status)
VALUES
  (
    (SELECT uuid FROM public.teams WHERE abbreviation = 'MCI'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS'),
    'Premier League',
    current_timestamp + interval '2 hours',
    'scheduled'
  ),
  (
    (SELECT uuid FROM public.teams WHERE abbreviation = 'LIV'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'CHE'),
    'Premier League',
    current_timestamp + interval '1 day',
    'scheduled'
  ),
  (
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BAY'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BVB'),
    'Bundesliga',
    current_timestamp + interval '3 days',
    'scheduled'
  );

-- finished matches (past kickoff, final result)
INSERT INTO public.matches (home_team_uuid, away_team_uuid, competition, kickoff_time, status, home_score, away_score)
VALUES
  (
    (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'LIV'),
    'Premier League',
    current_timestamp - interval '3 days',
    'finished',
    2, 2
  ),
  (
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BVB'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BAY'),
    'Bundesliga',
    current_timestamp - interval '7 days',
    'finished',
    0, 3
  );

-- match_events for the live Real Madrid vs Barcelona match
INSERT INTO public.match_events (match_uuid, team_uuid, event_type, minute, player_name, detail)
VALUES
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'RMA'),
    'GOAL', 12, 'Jude Bellingham', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BAR'),
    'YELLOW_CARD', 29, 'Frenkie de Jong', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BAR'),
    'GOAL', 41, 'Robert Lewandowski', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    NULL,
    'HALF_TIME', 45, NULL, NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'RMA'),
    'SUBSTITUTION', 58, 'Endrick', 'on for Rodrygo'
  );

-- match_events for the two finished matches
INSERT INTO public.match_events (match_uuid, team_uuid, event_type, minute, player_name, detail)
VALUES
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS') AND status = 'finished'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS'), 'GOAL', 22, 'Bukayo Saka', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS') AND status = 'finished'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'LIV'), 'GOAL', 34, 'Mohamed Salah', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS') AND status = 'finished'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS'), 'GOAL', 67, 'Gabriel Jesus', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS') AND status = 'finished'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'LIV'), 'GOAL', 81, 'Darwin Nunez', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'ARS') AND status = 'finished'),
    NULL, 'FULL_TIME', 90, NULL, NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'BVB') AND status = 'finished'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BAY'), 'GOAL', 15, 'Harry Kane', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'BVB') AND status = 'finished'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BAY'), 'GOAL', 52, 'Jamal Musiala', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'BVB') AND status = 'finished'),
    (SELECT uuid FROM public.teams WHERE abbreviation = 'BAY'), 'GOAL', 77, 'Leroy Sane', NULL
  ),
  (
    (SELECT uuid FROM public.matches WHERE home_team_uuid = (SELECT uuid FROM public.teams WHERE abbreviation = 'BVB') AND status = 'finished'),
    NULL, 'FULL_TIME', 90, NULL, NULL
  );

-- follows: give the two demo users some starting follows
INSERT INTO public.user_followed_teams (user_uuid, team_uuid)
VALUES
  ((SELECT uuid FROM public.users WHERE handle = 'andrewbrown'), (SELECT uuid FROM public.teams WHERE abbreviation = 'RMA')),
  ((SELECT uuid FROM public.users WHERE handle = 'khayrullo'), (SELECT uuid FROM public.teams WHERE abbreviation = 'BAR'));

INSERT INTO public.user_followed_matches (user_uuid, match_uuid)
VALUES
  ((SELECT uuid FROM public.users WHERE handle = 'andrewbrown'), (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1));

-- match_reactions on the live match so the timeline isn't empty on first load
INSERT INTO public.match_reactions (match_uuid, user_uuid, message, expires_at)
VALUES
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    (SELECT uuid FROM public.users WHERE handle = 'andrewbrown'),
    'WHAT A GOAL',
    current_timestamp + interval '3 hours'
  ),
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    (SELECT uuid FROM public.users WHERE handle = 'khayrullo'),
    'Lewandowski still has it',
    current_timestamp + interval '3 hours'
  ),
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    (SELECT uuid FROM public.users WHERE handle = 'sarah'),
    'Madrid are dominating this half.',
    current_timestamp + interval '3 hours'
  ),
  (
    (SELECT uuid FROM public.matches WHERE status = 'live' LIMIT 1),
    (SELECT uuid FROM public.users WHERE handle = 'alex'),
    'That defending...',
    current_timestamp + interval '3 hours'
  );
