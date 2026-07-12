# Aiolos Infrastructure

Single production environment on AWS (shared `resonect-prod` account,
`eu-central-1`): one ARM EC2 box running Docker Compose behind Traefik, deployed
from GitHub Actions via OIDC + SSM (no SSH, no static AWS keys).

## Layout

- `prod/` — Terraform (S3 state backend `projects/aiolos/terraform.tfstate`),
  plus the runtime `docker-compose.prod.yml` and `traefik.yml` that CI uploads
  to the box.
- `docker-compose.dev.yml` + `Caddyfile.dev` — local full-stack test
  (`docker compose -f infra/docker-compose.dev.yml up --build`, then
  http://localhost).

## Production topology

```
ESP32 stations ── plain HTTP :80 to the reserved EIP ──┐
                                                       │ (raw IP — bypasses Cloudflare;
                                                       │  the cellular modem's DNS is unreliable)
Browsers ── HTTPS :443 via Cloudflare (aiolos.resonect.cz) ─┤
                                                       ▼
                              EC2 t4g.micro (Ubuntu 24.04 arm64), Elastic IP
                              └─ Docker Compose @ /opt/aiolos
                                 ├─ traefik:v3.6 (LE via Cloudflare DNS-01)
                                 ├─ aiolos-backend (AdonisJS + Prisma, SQLite at ./data:/data)
                                 └─ aiolos-frontend (nginx SPA)
```

Load-bearing constraints:

- **Stations POST plain HTTP to the reserved Elastic IP on port 80** (no TLS in
  the firmware). They target the raw IP, not a hostname, because the SIM7000G
  modem's DNS resolution is unreliable. The Traefik ingest router on the `web`
  entrypoint is host-agnostic (`PathPrefix('/api')`, no redirect) so raw-IP
  posts match and are never bounced to HTTPS.
- `aiolos.resonect.cz` is the **HTTPS-only frontend** (Cloudflare-proxied).
  Since no device uses the hostname, Cloudflare "Always Use HTTPS" may be ON.
- The SQLite file at `/opt/aiolos/data/db.sqlite3` is the only stateful thing on
  the box. Back it up before risky operations.
- SSE (`/__transmit`) is excluded from compression in the Traefik labels.

## AWS access & SSO

Two named SSO profiles (configure them in your own `~/.aws/config` via
`aws configure sso` against the Resonect SSO — do **not** commit the start URL
or account IDs to this public repo):

- `resonect-prod` — the prod account (AWS provider + `ssm start-session`).
- `resonect-master` — the account that owns the Terraform S3 state backend.

Log in before Terraform / deploys:

```sh
task login:prod        # aws sso login --profile resonect-prod --use-device-code
task login:master      # needed for the state backend
```

Shell into the box: `aws ssm start-session --target <instance-id>` (profile
`resonect-prod`). There is no SSH ingress.

## Deploys

Publish a GitHub Release with a `v*` tag —
`gh release create vX.Y.Z --generate-notes` — (or `workflow_dispatch` as an
escape hatch) → build images to ECR → SSM Run Command pulls configs from
`s3://aiolos-prod-deploy-config`, renders `.env.prod`/`.env.traefik` from SSM
parameters (`/aiolos/prod/...`), and runs `docker compose up -d --wait`. Secrets
live only in SSM Parameter Store (`aws ssm put-parameter --overwrite ...`);
Terraform tracks the parameters but ignores their values.

### Release checklist (station ↔ backend coupling)

- **Config units:** the `station_configs` interval columns are MILLISECONDS
  (`restartInterval` alone is seconds). The pre-2026 Lucid seeder wrote seconds
  — before flashing a station against an existing database, check its latest
  config row holds ms-scale values (the admin UI presets are always safe). Both
  the config POST endpoint and the firmware clamp ranges now, but a legacy row
  predates both.
- **Station API key (enable runbook):** the backend's `stationAuth` middleware
  is fail-open — it enforces `X-API-Key` on the station POST routes only when
  `STATION_API_KEY` is set in its environment, and the backend logs
  `Station ingest auth: ENFORCED|OPEN` at boot. The env value comes from SSM
  (`/aiolos/prod/backend/station-api-key`); while that parameter still holds
  Terraform's `PLACEHOLDER`, the deploy refuses to ship it, so enforcement stays
  OFF until you deliberately turn the knob. Ordering matters — firmware first,
  server second (a server-side key with no matching firmware 401s every station,
  including the OTA-confirm route needed to fix it remotely):
  1. `openssl rand -hex 24`; set it as `STATION_API_KEY` in
     `firmware/secrets.ini`, build and flash the station.
  2. Store the same key in SSM (profile `resonect-prod`):
     ```sh
     aws ssm put-parameter --name /aiolos/prod/backend/station-api-key \
       --type SecureString --value <key> --overwrite
     ```
  3. Enforcement turns on at the next release deploy.
  4. Verify: a keyless
     `curl -X POST http://<EIP>/api/stations/vasiliki-001/wind -d '{}'` returns
     401 while station data keeps flowing on the dashboard.

## Terraform

```sh
cd infra/prod
task login:prod && task login:master
terraform init
terraform plan
```

State lives in the shared S3 backend (`resonect-terraform-state-211125605653`,
key `projects/aiolos/...`); it is never committed. The reserved Elastic IP that
stations target is a Terraform-managed `aws_eip` — its address goes into
`firmware/secrets.ini` (gitignored), never into a tracked file.
