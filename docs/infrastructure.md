# Infrastructure

Region: `eu-central-1` throughout. Account: `792026110723`.

## Status

| Piece | Status |
|---|---|
| ECR repos (backend, frontend) | live |
| VPC / ALB / security groups | live (reuses default VPC `vpc-06aa1c7388f872cc3`) |
| ECS cluster + Fargate services | live |
| RDS Postgres | live, reused (`cruddur-db-instance`); workout + outbox schema loaded (see "Workout event pipeline") |
| S3 + Lambda avatar pipeline (+ DynamoDB) | live |
| SQS queue `blinkr-workout-events` | live (`blinkr-events`) |
| VPC endpoints (DynamoDB gateway, SSM + KMS interface) | live (`blinkr-network`) |
| Outbox worker (one-shot Fargate task) + EventBridge Scheduler | live, runs every minute |
| Workout analytics Lambda + DynamoDB `blinkr-workout-analytics` | live (`blinkr-workout-analytics`), validated end to end |
| CodePipeline + CodeBuild | live, native ECS rolling deploy |
| CodeDeploy (blue/green) | **blocked** -- see below |
| Route 53 + ACM (custom domain, HTTPS) | live |

Custom domain `blinkr.fit` is live over HTTPS via Route 53 + ACM. Port 80 (frontend) and port 8080 (backend) both 301-redirect to their HTTPS counterparts (443 / 8443).

## How to reach it

- Frontend: `https://blinkr.fit` (`http://blinkr.fit` redirects here)
- Backend API: `https://blinkr.fit:8443` (`http://blinkr.fit:8080` redirects here)
- Raw ALB DNS name (still works directly, plain HTTP, no cert coverage): `http://blinkr-alb-2112977045.eu-central-1.elb.amazonaws.com`

The backend is on its own listener/port (8080/8443) rather than an `/api/*` path rule on port 80/443. This wasn't the original plan -- see "Design decisions" below for why.

## Route 53 + ACM

- Hosted zone: `blinkr.fit`, zone ID `Z10430672K07ETSA6OYXU`. Domain registered at Namecheap; nameservers point at the Route 53 zone's 4 NS records.
- ACM certificate (region `eu-central-1`, matching the ALB -- ACM certs used by an ALB listener must be in the same region as the ALB): `arn:aws:acm:eu-central-1:792026110723:certificate/146217d5-ea1c-4be0-ad5b-b9d8c6201c0c`, covers `blinkr.fit` and `*.blinkr.fit` (so `www.blinkr.fit` is covered by the wildcard SAN), DNS-validated with the CNAME record living in the hosted zone itself.
- `blinkr.fit` and `www.blinkr.fit` are Route 53 ALIAS A records pointed at the ALB.
- `network.yaml`'s `CertificateArn` parameter gates the HTTPS listeners behind a `HasCertificate` condition, so the stack still deploys cleanly with no cert (plain HTTP, no redirect) if the parameter is ever left blank again.

## CloudFormation stacks

All templates in `infra/cloudformation/`, deployed via `aws cloudformation deploy`, region `eu-central-1`.

1. **blinkr-network** (`network.yaml`) -- ALB, listeners (80 frontend / 8080 backend), target groups (+ green pairs for future blue/green), security groups. Reuses the existing default VPC and its 3 public subnets. Adds an ingress rule to the existing RDS security group (`sg-091e9ec1d7328df01`) allowing the Fargate security group on 5432. Also owns the VPC endpoints for VPC-attached (public-IP-less) workloads such as the analytics Lambda: a **DynamoDB gateway endpoint** (free, route-table based), and **SSM + KMS interface endpoints** (private DNS on, ENIs in the 3 subnets, dedicated `blinkr-vpc-endpoints-sg` allowing 443 only from the Fargate security group). There is intentionally no NAT Gateway; ECS tasks reach AWS APIs via their public IP instead. Target group health check is `/health`.
2. **blinkr-serverless** (`serverless.yaml`) -- S3 bucket `blinkr-avatars-792026110723`, DynamoDB table `blinkr-avatars`, Lambda `blinkr-avatar-processor` (code in `infra/lambda/avatar-processor/`, pushed separately via `aws lambda update-function-code` since CFN's inline `ZipFile` can't hold real multi-line code cleanly).
3. **blinkr-ecs** (`ecs.yaml`) -- ECS cluster `blinkr-cluster`, task definitions, Fargate services `blinkr-backend-v2` / `blinkr-frontend-v2` (see naming note below), a dedicated task execution role (`blinkr-ecs-task-execution-role`, NOT the pre-existing shared `ecsTaskExecutionRole` -- see below), and a backend task role for X-Ray + CloudWatch Logs + `sqs:SendMessage` (scoped to the workout queue). Also holds the **outbox worker**: task definition `blinkr-outbox-worker` (same backend image, command `python3 worker.py`, 256 CPU / 512 MB, env `AWS_DEFAULT_REGION` + `WORKOUT_EVENTS_QUEUE_URL`, secret `DATABASE_URL`, reuses the task/execution roles) with **no ECS service**, and an **EventBridge Scheduler** schedule `blinkr-outbox-worker-schedule` (`rate(1 minute)`, param `WorkerScheduleExpression`) that runs it as a one-shot Fargate task via its own narrowly scoped role `blinkr-outbox-scheduler-role`.
4. **blinkr-cicd** (`cicd.yaml`) -- CodeStar GitHub connection, CodeBuild project, CodePipeline with a native ECS rolling deploy (not CodeDeploy -- see blocker below).
5. **blinkr-events** (`events.yaml`) -- SQS standard queue `blinkr-workout-events`. No DLQ yet.
6. **blinkr-workout-analytics** (`workout-analytics.yaml`) -- DynamoDB table `blinkr-workout-analytics`, Lambda `blinkr-workout-analytics-consumer` (python3.12, x86_64, VPC-attached on the Fargate security group, psycopg2 layer), its execution role, and the SQS event source mapping (batch size 10, `ReportBatchItemFailures`). Code in `infra/lambda/workout-analytics-consumer/`.
7. **cicd-bluegreen-pending-codedeploy-access.yaml** -- NOT deployed. The originally-intended CodeDeploy blue/green setup (see blocker below), kept ready in the repo.

## Secrets

Real secrets (Rollbar token, Honeycomb key, prod DB connection string) are in SSM Parameter Store (`SecureString`) under `/blinkr/*`, never in committed templates:
- `/blinkr/rollbar_access_token`
- `/blinkr/honeycomb_api_key` (stores the full `x-honeycomb-team=<key>` header value, not just the raw key)
- `/blinkr/database_url`

The ECS task definitions reference these via the `secrets` field, not `environment`. The task execution role has a scoped inline policy for `ssm:GetParameters` on `/blinkr/*` and `kms:Decrypt` on the default SSM key.

## Design decisions worth knowing about

**Backend moved to its own listener (port 8080), not an `/api/*` path rule on port 80.** CodeDeploy's ECS blue/green support can only swap a whole listener's default action, not an individual path-based listener rule. The original plan was one listener with path routing; this had to change for CodeDeploy to be usable at all (even though CodeDeploy itself ended up blocked -- see below). Consequence: the frontend calls the backend cross-origin (`:80` -> `:8080`) instead of same-origin, so CORS is live in production (already handled -- `Authorization` is explicitly allowed/exposed).

**A new dedicated ECS task execution role, not the pre-existing `ecsTaskExecutionRole`.** Needed to attach SSM/KMS permissions for secrets. Modifying the existing shared role directly via IAM CLI was blocked by this environment's permission guardrails (sensitive action). Created `blinkr-ecs-task-execution-role` via CloudFormation instead -- cleaner anyway (stack-owned, not a shared implicit dependency).

**Services are named `blinkr-backend-v2` / `blinkr-frontend-v2`, not `blinkr-backend` / `blinkr-frontend`.** `DeploymentController` on `AWS::ECS::Service` is immutable in practice but CloudFormation doesn't model it as forcing replacement, so an in-place update to change it fails. Renaming the logical resource (and the ECS service name) forced CloudFormation to create fresh services and clean up the old ones. If you rebuild this from scratch, there's no reason to keep the `-v2` suffix -- it's an artifact of this session's pivot away from CodeDeploy, not a naming convention to continue.

**Postgres wired for real** (not left as mock data). `backend-flask/lib/db.py` + `psycopg2-binary`. (The original football domain has since been removed; the app is now the workout domain -- see "Workout event pipeline".) Local dev (`docker-compose.yaml`) points at the local `db` container; ECS points at the RDS instance via the `/blinkr/database_url` SSM parameter. Schema was loaded onto RDS by running the already-built backend image as a one-off Fargate task (`aws ecs run-task` with a Python/psycopg2 command override) rather than opening the RDS security group to this machine's IP -- kept the DB's network exposure unchanged. Schema changes to RDS are always a separate, deliberate step. **Do not run `backend-flask/db/schema.sql` as-is against RDS** -- it starts with `DROP TABLE ... users CASCADE` and would delete the existing users. The workout tables were applied additively (only the `CREATE TABLE`/index statements from `exercises` onward) via a one-off task.

## Workout event pipeline

```
API (ECS)  --PATCH /complete-->  PostgreSQL: ONE transaction
                                   ├─ workout_sessions.completed_at
                                   └─ outbox_events row (unpublished)
                                        │
EventBridge Scheduler (every minute) -> one-shot ECS/Fargate task `python3 worker.py`
                                        │  claims rows (FOR UPDATE SKIP LOCKED), marks published_at
                                        ▼
                              SQS  blinkr-workout-events
                                        │  event source mapping, partial batch failures
                                        ▼
        Lambda blinkr-workout-analytics-consumer
          ├─ reads started_at/completed_at from PostgreSQL (RDS, via the VPC)
          └─ DynamoDB TransactWriteItems: idempotency marker + aggregate update
```

- PostgreSQL is the source of truth; DynamoDB is a derived read model. The SQS publish is never in the request path -- an SQS outage can't fail a completion, and unpublished outbox rows are simply retried on the next scheduled run.
- **DynamoDB `blinkr-workout-analytics`** (partition key `pk`, no sort key): `USER#<user_id>` holds `total_completed_workouts`, `total_duration_seconds`, `last_completed_at`; `EVENT#<event_id>` is the idempotency marker. Both are written in one transaction with `attribute_not_exists` on the marker, so a redelivered event is skipped and can't double count. Read a user's stats with `GetItem(pk="USER#<user_id>")`.
- Delivery is at-least-once end to end (outbox -> SQS -> Lambda); idempotency lives in the Lambda's DynamoDB write, not in the transport.
- The outbox worker and the Lambda both reach RDS through the existing Fargate security group (already allowed on 5432). The Lambda additionally needs the VPC endpoints above: DynamoDB, SSM (to read `/blinkr/database_url`) and KMS.

## Deploying it (validated order)

Run in this order; each step's outputs feed the next stack's parameters.

1. **Build + publish the psycopg2 layer:** `infra/lambda/workout-analytics-consumer/build-layer.sh publish` (needs AWS credentials, no Docker). Prints the **versioned layer ARN**. Built for python3.12 / x86_64 from a pinned `psycopg2-binary` wheel.
2. **Push the backend image** to ECR under a commit-hash tag (`blinkr-backend:<git short sha>`), *before* steps 3-4: `docker build -f backend-flask/Dockerfile.prod ...` then `docker push`. The API and the worker task definition share this one image (the worker just overrides the command).
3. **`blinkr-events`** -- `aws cloudformation deploy --stack-name blinkr-events --template-file infra/cloudformation/events.yaml`. Outputs `QueueUrl` / `QueueArn`.
4. **`blinkr-network`** -- adds the endpoints and changes the health check to `/health`.
5. **`blinkr-ecs`** -- new image tag, queue URL/ARN, worker task definition + scheduler. Run steps 4 and 5 **back to back**: after step 4 the ALB health-checks `/health`, which an old image doesn't serve, until step 5 rolls the service to the new image.
6. **`blinkr-workout-analytics`** -- takes the layer ARN and queue ARN.
7. **Push the Lambda handler** after the stack exists (the template's `ZipFile` is only a placeholder): zip `infra/lambda/workout-analytics-consumer/handler.py` at the archive root and run `aws lambda update-function-code --function-name blinkr-workout-analytics-consumer --zip-file fileb://handler.zip`. Do this before any real events arrive.

For existing stacks (`blinkr-network`, `blinkr-ecs`) use `aws cloudformation deploy --no-execute-changeset`, review the change set, then `execute-change-set`. Deploy with `--capabilities CAPABILITY_NAMED_IAM` for stacks that own IAM roles.

### Parameters the operator must supply

| Stack | Parameter | Value / where it comes from |
|---|---|---|
| `blinkr-network` | `RouteTableIds` | Route table(s) of the 3 subnets -- the default VPC's main route table, `rtb-0cdce9e9cd8f5430a` (`aws ec2 describe-route-tables`). Not owned by any stack. |
| `blinkr-network` | `CertificateArn` | **Must be passed on every update** (live value under "Route 53 + ACM"). Leaving it at its default blank value deletes the HTTPS listeners. Also `VpcId`, `SubnetIds`, `RdsSecurityGroupId` (see the live stack). |
| `blinkr-ecs` | `BackendImage` | Full image URI with the commit-hash tag pushed in step 2 -- not `latest`. |
| `blinkr-ecs` | `WorkoutEventsQueueUrl`, `WorkoutEventsQueueArn` | Outputs of `blinkr-events`. |
| `blinkr-ecs` | `WorkerScheduleExpression` | Optional; default `rate(1 minute)`. |
| `blinkr-workout-analytics` | `Psycopg2LayerArn` | The versioned ARN printed in step 1 (e.g. `...:layer:blinkr-psycopg2:1`). No default. |
| `blinkr-workout-analytics` | `WorkoutEventsQueueArn`, `SubnetIds`, `FargateSecurityGroupId` | Queue ARN from `blinkr-events`; the same subnets and the `FargateSecurityGroupId` output of `blinkr-network`. |

`blinkr-ecs` also takes all the pre-existing parameters (target groups, Cognito ids, secret ARNs, URLs) -- copy them from the live stack (`aws cloudformation describe-stacks --stack-name blinkr-ecs`) rather than re-deriving.

### Operational notes

- RDS is only reachable from the Fargate security group, so ad-hoc SQL is run as a one-off Fargate task (`aws ecs run-task` on the backend task definition with a Python/psycopg2 command override) and read from the `/ecs/blinkr-backend` logs.
- Check the pipeline: worker runs log `outbox worker: processed N event(s)` in `/ecs/blinkr-outbox-worker`; Lambda logs are in `/aws/lambda/blinkr-workout-analytics-consumer`; queue depth via `aws sqs get-queue-attributes`.
- The interface endpoints bill per endpoint per AZ-hour (2 endpoints x 3 AZs) plus data processing; the DynamoDB gateway endpoint is free.
- Known gaps: no DLQ on the queue (a permanently malformed message is retried indefinitely); the Lambda failure/retry path has not been exercised in AWS; the RDS instance has `PubliclyAccessible: True` (its security group still only admits the Fargate security group).

## Known blocker: CodeDeploy

This AWS account returns `SubscriptionRequiredException` on **every** CodeDeploy API call, including read-only ones (`aws deploy list-applications` fails the same way). This is an account-level restriction -- no IAM policy, CloudFormation permission, or template fix resolves it. It needs either:
- time (some AWS accounts have temporary service restrictions during an initial verification period), or
- a support ticket to AWS asking for CodeDeploy to be enabled on this account.

`infra/cloudformation/cicd-bluegreen-pending-codedeploy-access.yaml` has the full CodeDeploy blue/green setup (Applications, DeploymentGroups, blue/green target group pairs, the pipeline's `CodeDeployToECS` deploy actions) written and validated (`cfn-lint` clean), just not deployed. To switch over once CodeDeploy is available:
1. Add `DeploymentController: {Type: CODE_DEPLOY}` back to both services in `ecs.yaml` (was removed as part of this fix) and redeploy (this will again force a service replacement -- expect the `-v2`-style renaming dance again, or just accept the recreate).
2. Deploy `cicd-bluegreen-pending-codedeploy-access.yaml`.
3. Swap `blinkr-cicd`'s pipeline Deploy stage for the blue/green one (or just deploy the CodeDeploy stack standalone and manually point CodePipeline's Deploy stage at it).

## Known blocker: GitHub connection needs manual approval

`GitHubConnection` (`AWS::CodeStarConnections::Connection`) is created by `cicd.yaml` but starts in `PENDING` status -- AWS requires a human to approve the GitHub OAuth handshake in the console (Developer Tools > Settings > Connections). This is a hard AWS requirement, not something any CLI/API call can do. **The pipeline will not run its first execution until this is done.** Steps:
1. AWS Console -> CodePipeline -> Settings -> Connections (or Developer Tools > Connections directly)
2. Find `blinkr-github`, click "Update pending connection"
3. Authorize the AWS Connector for GitHub app against the `khayrullo-isomiddinov/blinkr` repo
4. Once `AVAILABLE`, push to `main` (or manually start the pipeline) to trigger the first run

## Known gap: unconfigured secrets

`ROLLBAR_ACCESS_TOKEN` and `HONEYCOMB_API_KEY` are still placeholders in local `.env` and were pushed into SSM as-is -- Rollbar/Honeycomb calls in prod will fail the same way they do locally (non-blocking, already true before this session). Fill in the local `.env` and re-run:
```
aws ssm put-parameter --region eu-central-1 --name /blinkr/rollbar_access_token --value "<real token>" --type SecureString --overwrite
aws ssm put-parameter --region eu-central-1 --name /blinkr/honeycomb_api_key --value "x-honeycomb-team=<real key>" --type SecureString --overwrite
```
Then force a new deployment of the backend service to pick up the new secret values (SSM values are read at task start, not live-reloaded).

## Serverless piece: avatar upload pipeline

Not wired into any frontend UI (wasn't asked for) -- pure infrastructure, independently testable:

1. Upload an image to `s3://blinkr-avatars-792026110723/uploads/<user_uuid>/<filename>`
2. `blinkr-avatar-processor` Lambda fires on the `ObjectCreated` event, validates it's actually a JPEG/PNG/GIF (magic-byte sniffing, no image library dependency), copies it to `processed/<user_uuid>/<filename>`, and writes a metadata row to the `blinkr-avatars` DynamoDB table (partition key `user_uuid`, sort key `uploaded_at`) with checksum, content type, size, and status (`processed` or `rejected`).
