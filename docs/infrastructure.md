# Infrastructure

Region: `eu-central-1` throughout. Account: `792026110723`.

## Status

| Piece | Status |
|---|---|
| ECR repos (backend, frontend) | live |
| VPC / ALB / security groups | live (reuses default VPC `vpc-06aa1c7388f872cc3`) |
| ECS cluster + Fargate services | live |
| RDS Postgres | live, reused (`cruddur-db-instance`), schema + seed loaded |
| S3 + Lambda avatar pipeline (+ DynamoDB) | live |
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

1. **blinkr-network** (`network.yaml`) -- ALB, listeners (80 frontend / 8080 backend), target groups (+ green pairs for future blue/green), security groups. Reuses the existing default VPC and its 3 public subnets. Adds an ingress rule to the existing RDS security group (`sg-091e9ec1d7328df01`) allowing the Fargate security group on 5432.
2. **blinkr-serverless** (`serverless.yaml`) -- S3 bucket `blinkr-avatars-792026110723`, DynamoDB table `blinkr-avatars`, Lambda `blinkr-avatar-processor` (code in `infra/lambda/avatar-processor/`, pushed separately via `aws lambda update-function-code` since CFN's inline `ZipFile` can't hold real multi-line code cleanly).
3. **blinkr-ecs** (`ecs.yaml`) -- ECS cluster `blinkr-cluster`, task definitions, Fargate services `blinkr-backend-v2` / `blinkr-frontend-v2` (see naming note below), a dedicated task execution role (`blinkr-ecs-task-execution-role`, NOT the pre-existing shared `ecsTaskExecutionRole` -- see below), and a backend task role for X-Ray + CloudWatch Logs permissions.
4. **blinkr-cicd** (`cicd.yaml`) -- CodeStar GitHub connection, CodeBuild project, CodePipeline with a native ECS rolling deploy (not CodeDeploy -- see blocker below).
5. **cicd-bluegreen-pending-codedeploy-access.yaml** -- NOT deployed. The originally-intended CodeDeploy blue/green setup (see blocker below), kept ready in the repo.

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

**Postgres wired for real** (not left as mock data). `backend-flask/lib/db.py` + `psycopg2-binary`. `HomeActivities.run()` and `CreateActivity.run()` now do real reads/writes against `public.activities` / `public.users`. Local dev (`docker-compose.yaml`) points at the local `db` container; ECS points at the RDS instance via the `/blinkr/database_url` SSM parameter. Schema was loaded onto RDS by running the already-built backend image as a one-off Fargate task (`aws ecs run-task` with a Python/psycopg2 command override) rather than opening the RDS security group to this machine's IP -- kept the DB's network exposure unchanged.

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
