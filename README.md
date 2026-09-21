# Blinkr

Blinkr is a real-time football match discussion platform built on AWS. Users
can follow matches, view live match events, and participate in temporary fan
discussions around ongoing games.

Reactions are scoped to a single match and expire on a schedule tied to that
match's lifecycle -- visible for the duration of play plus a short grace
window, then out of the active feed. The goal is a focused conversation
around a live event rather than a permanent, generic social timeline.

## Core concepts

- **Team** -- a football club (`name`, `short_name`, `abbreviation`, `country`).
- **Match** -- a fixture between two teams (`home_team`, `away_team`,
  `kickoff_time`, `status`, `home_score`, `away_score`). Status is one of
  `scheduled` / `live` / `half_time` / `finished`.
- **Match event** -- an official occurrence in a match: `GOAL`,
  `YELLOW_CARD`, `RED_CARD`, `SUBSTITUTION`, `HALF_TIME`, `FULL_TIME`. Events
  are the single source of truth for a match's score and status -- creating
  one is the only thing that changes `home_score`/`away_score`/`status`.
- **Match reaction** -- a short, user-posted comment tied to one match.
  Expiration is deterministic, not a generic timer: it's computed when the
  reaction is created (long-lived while the match is still playing) and then
  tightened the moment that match's `FULL_TIME` event is recorded.
- Users can follow **teams** and **matches**; a "Following" page surfaces
  matches you follow that are live or starting soon.

There's no external football data API -- matches and events are seeded
(`db/seed.sql`) or created through two small admin endpoints
(`POST /api/matches`, `POST /api/matches/:id/events`; see
`backend-flask/bin/demo-match-simulation` for a scripted walkthrough), which
is enough to demonstrate the event-driven architecture without adding an
unnecessary external dependency.

## Architecture

```
                         Route 53 (blinkr.fit)
                                |
                               ACM (HTTPS)
                                |
                               ALB
                                |
                          ECS / Fargate
                    ---------------------------
                    |                         |
              frontend-react-js         backend-flask
              (static build, nginx)     (Flask + gunicorn)
                                                |
                                          RDS / PostgreSQL
                                    users, teams, matches, match_events,
                                    match_reactions, follow join tables
                                                |
                                    X-Ray + OpenTelemetry (Honeycomb)
                                    + CloudWatch Logs + Rollbar

  S3  --ObjectCreated-->  Lambda  -->  DynamoDB
  (avatar uploads)   (validate/process)  (per-upload status)
  -- a separate pipeline, unrelated to match data

CloudFormation  -->  all of the above, as code
CodePipeline -> CodeBuild -> ECS rolling deploy  -->  CI/CD
```

The browser never talks to the database directly -- every read/write goes
through the Flask API, which is the only thing that knows how to translate
"post a reaction" or "record a goal" into the right SQL.

### Why each AWS service is used

| Service | Role in Blinkr |
|---|---|
| ECS/Fargate | Runs the Flask API and the built React static site as containers, no servers to patch |
| RDS (Postgres) | Source of truth for **all** football domain data -- users, teams, matches, events, reactions, follows. This is genuinely relational data (matches reference two teams, events/reactions reference a match, follows are many-to-many) so it lives in one transactional relational store rather than being split across databases for its own sake |
| ALB | Routes public traffic to the frontend and backend Fargate services (frontend on :80/:443, backend on its own :8080/:8443 listener) |
| Route 53 + ACM | `blinkr.fit` domain + HTTPS |
| S3 + Lambda + DynamoDB | A **separate, standalone** pipeline: S3 receives a user avatar upload, a Lambda validates/processes the image, DynamoDB tracks per-upload status (partition key `user_uuid`, sort key `uploaded_at`). This is real, working, event-driven infrastructure -- it just isn't part of the match/reaction data model, and nothing in this project moves football data into DynamoDB artificially |
| X-Ray + OpenTelemetry (Honeycomb) | Distributed tracing across the Flask app, with manual spans around the two places that matter most for the event-driven story: `CreateMatchEvent` (event -> score/status update) and `CreateMatchReaction` (reaction -> expiry computation) |
| CloudWatch + Rollbar | Logs and error reporting |
| CodePipeline + CodeBuild | Builds both Docker images and rolls them out to ECS on every push to `main` |
| CloudFormation | All of the above defined as code under `infra/cloudformation/` |

### Event-driven behavior

Match state isn't edited directly -- it's derived from events, in one place:

```
POST /api/matches/:id/events
        |
CreateMatchEvent.run()
        |
   INSERT INTO match_events
        |
   GOAL?          -> UPDATE matches SET home_score/away_score += 1
   HALF_TIME?     -> UPDATE matches SET status = 'half_time'
   FULL_TIME?     -> UPDATE matches SET status = 'finished'
                     + tighten any still-long-lived match_reactions' expiry
        |
   clients polling /api/matches/:id, /events, /reactions
   pick up the change on their next refresh (10s on the match page)
```

Run `backend-flask/bin/demo-match-simulation` against a running backend to
watch this end to end: it creates a fixture, then posts a goal, a yellow
card, a substitution, half time, a second goal, and full time as real HTTP
requests, printing each step's response.

### Real-time behavior

There's no WebSocket layer in this project, so live updates are done with
plain client-side polling (`setInterval` + refetch): the dashboard re-fetches
live matches every 20s, and the match page re-fetches the match, its events,
and its reactions every 10s. This is enough to make scores, statuses, events,
and reactions update without a manual page refresh at this scale, without
introducing a new real-time transport just to have one.

## Backend

Flask app (`backend-flask/`), no ORM -- plain parameterized SQL via
`lib/db.py`, one service class per action under `services/` (e.g.
`CreateMatchReaction`, `FollowTeam`), matching the pattern the project
started with. Auth is Cognito JWT verification (`lib/cognito_jwt_token.py`,
`lib/auth.py`) resolved to a `public.users` row per request; no session
state is kept server-side. See `backend-flask/openapi-3.0.yml` for the full
API spec.

## Frontend

React (`frontend-react-js/`), deliberately plain HTML with no CSS framework
-- one file per route under `src/pages/`, a couple of small shared pieces
(`components/NavBar.js`, `components/TeamBadge.js`) to avoid repeating the
same markup on every page. `lib/api.js` wraps `fetch` with the stored
Cognito access token; `lib/matchTime.js` computes live-minute/kickoff-time
display client-side between polls.

## Database

See `backend-flask/db/schema.sql` for the full DDL. Indexes exist for every
query pattern the app actually runs: `matches(status, kickoff_time)` for the
live/upcoming lists, `match_events(match_uuid, minute)` for a match's
timeline, `match_reactions(match_uuid, created_at)` plus a separate
`match_reactions(expires_at)` index for the active-reactions filter, and the
`user_followed_teams`/`user_followed_matches` composite primary keys double
as the lookup index for "what does this user follow."

## Testing

```sh
cd backend-flask
pip install -r requirements.txt
pytest -v
```

The suite talks to the same local Postgres container (there's no mocking
layer for the raw-SQL data access in `lib/db.py`) -- it skips with a clear
message if the database isn't reachable or seed data isn't loaded. Coverage
focuses on behavior, not line count: match creation/filtering, event ->
score/status derivation, reaction expiration rules (including the
already-finished-match edge case), follow/unfollow idempotency and
not-found handling, and auth resolution.

## Local development

```sh
docker compose up -d --build
cd backend-flask
./bin/db-create        # first time only
./bin/db-schema-load
./bin/db-seed
```

This starts:
- `frontend-react-js` on http://localhost:3000
- `backend-flask` on http://localhost:4567
- `db` (Postgres) on localhost:5432
- `xray-daemon` (local X-Ray sidecar)

After seeding, the database tells a complete story on its own: one live
match (Real Madrid vs Barcelona, 1-1, several events and four fan reactions
already posted), three upcoming fixtures, and two finished results with
their own event history.

### Environment variables

`backend-flask/.env.example` and `frontend-react-js/.env.example` document
the minimal set needed locally. In addition to those, the backend also reads
(see `docker-compose.yaml` for local values): `DATABASE_URL`/`CONNECTION_URL`,
`AWS_COGNITO_USER_POOL_ID`, `AWS_COGNITO_USER_POOL_CLIENT_ID`,
`AWS_DEFAULT_REGION`, `ROLLBAR_ACCESS_TOKEN`, `OTEL_EXPORTER_OTLP_ENDPOINT`,
`OTEL_EXPORTER_OTLP_HEADERS`, `AWS_XRAY_DAEMON_ADDRESS`. Real secrets (RDS
password, Rollbar token, Honeycomb key) live only in a git-ignored root
`.env` locally and in SSM Parameter Store (`/blinkr/*`) in AWS -- never in
committed files.

## API

See `backend-flask/openapi-3.0.yml` for the full spec. Summary:

```
GET    /api/teams                       list teams (?followed=true for your own)
GET    /api/teams/:id                   team detail + its matches
POST   /api/teams/:id/follow            follow a team
DELETE /api/teams/:id/follow            unfollow a team

POST   /api/matches                     admin/demo: create a fixture
GET    /api/matches                     list matches (?followed=true for your own)
GET    /api/matches/live
GET    /api/matches/upcoming
GET    /api/matches/:id
GET    /api/matches/:id/events
POST   /api/matches/:id/events          admin/demo: record a match event
GET    /api/matches/:id/reactions
POST   /api/matches/:id/reactions       post a reaction (requires auth)
POST   /api/matches/:id/follow
DELETE /api/matches/:id/follow
```

## Infrastructure as code & CI/CD

All AWS resources are defined under `infra/cloudformation/` (`network.yaml`,
`ecs.yaml`, `serverless.yaml`, `cicd.yaml`). CI/CD is CodePipeline +
CodeBuild, defined in `cicd.yaml` and root `buildspec.yml`: a push to `main`
builds both Docker images, pushes them to ECR, and rolls them out to the two
ECS Fargate services via CodePipeline's native "Amazon ECS" deploy action.
CodeDeploy blue/green is fully written (`cicd-bluegreen-pending-codedeploy-access.yaml`,
`infra/codedeploy/*`) but **not currently live** -- it's blocked by an
account-level AWS restriction (`SubscriptionRequiredException` on every
CodeDeploy API call), not a code problem. See `docs/infrastructure.md` for
the full deployment history and status of every stack.

## Deployment

Promoting a schema change to production is a deliberate, separate step --
`./bin/db-schema-load prod` against the RDS instance, plus a decision about
production seed/migration data. It's not part of the local dev flow above,
and nothing in this repo runs it automatically.

## Known limitations

- `POST /api/matches` and `POST /api/matches/:id/events` have no admin-role
  check -- there's no admin system in this project, so they're open
  endpoints intended for demo/curl use, not exposed in the UI.
- A Cognito user who signs up isn't automatically inserted into
  `public.users` (no signup Lambda trigger exists) -- reaction/follow
  actions for such a user will 401 with `user_not_provisioned` until a row
  is added (the seeded demo users work out of the box).
- Viewing another user's profile (`/@handle`) doesn't show their followed
  teams/matches -- only your own profile does, since there's no public
  per-handle follows endpoint yet.
- DynamoDB is real and integrated, but scoped entirely to the avatar-upload
  pipeline above -- it does not back any football/match data.
