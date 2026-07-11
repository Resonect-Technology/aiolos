# Aiolos Infrastructure

Single production environment on AWS (shared `resonect-prod` account,
`eu-central-1`), hastr-staging-style: one ARM EC2 box running Docker Compose
behind Traefik, deployed from GitHub Actions via OIDC + SSM (no SSH, no static
AWS keys).

## Layout

- `prod/` — Terraform (S3 state backend `projects/aiolos/terraform.tfstate`),
  plus the runtime `docker-compose.prod.yml` and `traefik.yml` that CI uploads
  to the box. `legacy.tf` holds the pre-modernization stack until the cutover
  completes — see `prod/CUTOVER.md`.
- `docker-compose.dev.yml` + `Caddyfile.dev` — local full-stack test
  (`docker compose -f infra/docker-compose.dev.yml up --build`, then
  http://localhost).
- `Caddyfile` + `docker-compose.prod.yml` (this directory) — the OLD deploy
  stack, kept for reference until decommission.

## Production topology

```
ESP32 stations ── plain HTTP :80 ──┐
                                   ├─ Cloudflare proxy (aiolos.resonect.cz, orange cloud)
Browsers ───────── HTTPS :443 ─────┘        │
                                            ▼ (origin = EIP)
                              EC2 t4g.micro (Ubuntu 24.04 arm64)
                              └─ Docker Compose @ /opt/aiolos
                                 ├─ traefik:v3.6 (LE via Cloudflare DNS-01)
                                 ├─ aiolos-backend (AdonisJS + Prisma, SQLite at ./data:/data)
                                 └─ aiolos-frontend (nginx SPA)
```

Load-bearing constraints:

- Deployed ESP32 firmware POSTs **plain HTTP** to `aiolos.resonect.cz:80`. The
  API router on the `web` entrypoint must never redirect to HTTPS, and
  Cloudflare "Always Use HTTPS" must stay OFF.
- The SQLite file at `/opt/aiolos/data/db.sqlite3` is the only stateful thing on
  the box. Back it up before risky operations.
- SSE (`/__transmit`) is excluded from compression in the Traefik labels.

## Access & deploys

- Shell: `aws ssm start-session --target <instance-id>` (profile
  `resonect-prod`). There is no SSH ingress.
- Deploys: push to `main` (or `workflow_dispatch`) → build images to ECR → SSM
  Run Command pulls configs from `s3://aiolos-prod-deploy-config`, renders
  `.env.prod`/`.env.traefik` from SSM parameters (`/aiolos/prod/...`), and runs
  `docker compose up -d --wait`.
- Secrets: SSM Parameter Store is the source of truth
  (`aws ssm put-parameter --overwrite ...`); Terraform tracks the parameters but
  ignores their values.

## Terraform

```sh
cd infra/prod
aws sso login --profile resonect-prod   # + resonect-master for the state backend
terraform init
terraform plan
```

Historical note: an early `terraform.tfstate` was committed to git history
(removed in `aaf7317`; it contained resource IDs/IPs, no credentials). State now
lives in the shared S3 backend.
