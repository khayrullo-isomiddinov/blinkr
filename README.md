# App foundation

This repository is currently a clean application foundation, not a finished
product. The previous application (Blinkr, a football-match discussion app)
has been removed; the AWS/cloud infrastructure it ran on is preserved and
still live.

## What's here

- `backend-flask/` -- Flask app shell: startup, config/env loading, CORS,
  Cognito JWT verification (`lib/`), observability wiring (X-Ray,
  OpenTelemetry/Honeycomb, CloudWatch, Rollbar), and a single `GET /health`
  endpoint for the load balancer. No product endpoints yet.
- `frontend-react-js/` -- React app shell: build/start tooling (CRA + craco +
  Tailwind), Amplify/Cognito configuration, and a single placeholder route.
  No product UI yet.
- `infra/cloudformation/` -- ALB, ECS/Fargate, RDS, S3+Lambda+DynamoDB
  (avatar-upload pipeline), CodePipeline/CodeBuild, Route 53 + ACM. All
  reusable, not product-specific.
- `docs/infrastructure.md` -- current status of every AWS stack, known
  blockers, and how to reach the live environment.

## Local development

```sh
docker compose up -d --build
cd backend-flask
./bin/db-create        # first time only
./bin/db-schema-load
./bin/db-seed
```

This starts `frontend-react-js` (http://localhost:3000), `backend-flask`
(http://localhost:4567), `db` (Postgres), and `xray-daemon`.

## Next step

The product layer (models, API routes, pages, business logic) will be
implemented in a subsequent step, on top of this foundation.
