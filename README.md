# Blinkr

A workout-tracking app: log workout sessions, the exercises in them, and every set.
Live at https://blinkr.fit (API at https://blinkr.fit:8443).

## Run it locally

```sh
bash bin/dev
```

Then open http://localhost:3000. The script loads `.env`, sets up the database
(schema + starter exercises) if it is empty, and starts the API (`:4567`) and the UI (`:3000`).
It needs a local Postgres, `CONNECTION_URL` in `.env`, and internet access
(Cognito public keys are fetched on API start).

## Layout

| Path | What lives there |
|---|---|
| `backend-flask/app.py` | Flask composition root: CORS, Cognito, registers the route modules |
| `backend-flask/api/` | User-facing routes: `exercises`, `workout_sessions` (incl. session exercises and sets) |
| `backend-flask/admin/` | `/api/admin/*` routes, all behind one admin-group guard |
| `backend-flask/repositories/` | One class per SQL statement or read; no SQL in routes |
| `backend-flask/application/` | Use cases spanning several repositories (complete a workout + write its outbox event) |
| `backend-flask/events/`, `worker.py` | Event contract, publishers, and the outbox worker that publishes to SQS |
| `backend-flask/lib/` | Auth (Cognito JWT), database helpers, observability wiring |
| `backend-flask/db/` | `schema.sql` (destructive: drops and recreates), `seed.sql` (local only) |
| `frontend-react-js/src/features/` | One folder per area: `auth`, `workouts`, `exercises`, `admin`, `home` |
| `frontend-react-js/src/lib/` | API client, Cognito wrapper, error messages, formatting, `useLoad` |
| `frontend-react-js/src/layouts/`, `components/` | Signed-in app shell; shared UI states |
| `frontend-react-js/src/styles/index.css` | Tailwind plus the shared component classes (`.card`, `.input`, `.btn-primary`, ...) |
| `infra/cloudformation/` | ALB, ECS/Fargate, RDS, SQS, Lambda, DynamoDB, CI/CD, Route 53 + ACM |
| `docs/infrastructure.md` | Status of every AWS stack, how to deploy, known gaps |

## Tests

```sh
cd backend-flask && pip install -r requirements-dev.txt && pytest      # needs the local Postgres
cd frontend-react-js && npm ci && CI=true npm test
```

## Deploying

The pipeline does not start on a push. After pushing to `main`:

```sh
aws codepipeline start-pipeline-execution --name blinkr-pipeline --region eu-central-1
```

Never run `backend-flask/db/schema.sql` against the production database; it drops tables.
