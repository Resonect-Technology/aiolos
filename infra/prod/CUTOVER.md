# Blue/green cutover runbook (old box → new box)

The device hostname never changes: `aiolos.resonect.cz` is Cloudflare-proxied
(orange cloud), so flipping the origin EIP is invisible to the deployed ESP32
stations. **"Always Use HTTPS" must stay OFF** for this record — devices POST
plain HTTP on :80.

## Phase 0 — prep (no infra changes)

1. `aws sso login --profile resonect-prod` (and `resonect-master` for the state
   backend)
2. Back up prod data from the old box (SSH via bastion, as today):
   - stop backend:
     `docker compose -f ~/aiolos/docker-compose.prod.yml stop backend`
   - `cp ~/aiolos/data/db.sqlite3 ~/db-backup-$(date +%F).sqlite3`
   - restart backend, copy the backup AND `~/aiolos/.env` to your machine (the
     `.env` holds APP_KEY / ADMIN_API_KEY values for SSM)

## Phase 1 — state to S3 (from infra/prod/)

3. `terraform init -migrate-state` (local → S3
   `projects/aiolos/terraform.tfstate`)
4. `terraform state list` — must show the legacy instance/SG/IAM/EIP + 2 ECR
   repos
5. `terraform plan` — legacy resources must be no-op; new resources show as
   create. The `cloudflare_dns_record.aiolos` create must NOT be applied yet →
   apply everything else first:
   `terraform apply -target'ing is fiddly; easiest is to comment out dns.tf for this first apply.`

## Phase 2 — new box up, old box still serving

6. `terraform apply` (dns.tf still commented) → new instance, EIP, IAM, OIDC
   role, SSM params (placeholders), deploy-config bucket
7. Populate SSM values (`aws ssm put-parameter --overwrite ...`):
   - `/aiolos/prod/backend/app-key` + `admin-api-key` ← old box `.env`
   - `/aiolos/infrastructure/cloudflare-resonect-api-token` +
     `/aiolos/prod/traefik/cf-dns-api-token` ← Cloudflare token with DNS edit on
     resonect.cz (mint a dedicated one)
   - `/aiolos/config/cloudflare-resonect-zone-id` ← resonect.cz zone id
8. Run the deploy workflow (`workflow_dispatch`) → new box serves (empty DB)
9. Verify against the new EIP directly:
   - `curl -s -o /dev/null -w '%{http_code}' http://<new-eip>/healthcheck -H 'Host: aiolos.resonect.cz'`
     → 200
   - `curl -sk --resolve aiolos.resonect.cz:443:<new-eip> https://aiolos.resonect.cz/`
     → SPA HTML + valid LE cert

## Phase 3 — data + flip (few minutes downtime; pick a low-wind hour)

10. Uncomment dns.tf; import the existing record:
    `terraform import cloudflare_dns_record.aiolos <zone_id>/<record_id>`
    (record id: Cloudflare dashboard → DNS → aiolos record → API id)
11. Freeze writes: stop the backend container on the OLD box
12. Copy fresh `db.sqlite3` old box →
    `s3://aiolos-prod-deploy-config/migration/` → new box
    (`aws ssm start-session --target <new-instance-id>`):
    - `docker compose -f /opt/aiolos/docker-compose.prod.yml stop backend`
    - `aws s3 cp s3://aiolos-prod-deploy-config/migration/db.sqlite3 /opt/aiolos/data/db.sqlite3`
    - `docker compose -f /opt/aiolos/docker-compose.prod.yml start backend`
    - the entrypoint baselines the Lucid-era DB (0_init) and applies
      1_normalize_datetimes automatically — check `docker logs aiolos-backend`
13. `terraform apply` → Cloudflare record flips to the new EIP (instant)
14. Delete the migration object from S3

## Phase 4 — verify

- ESP32 POSTs appear in `docker logs -f aiolos-backend` within their send
  interval; fresh wind data lands on the dashboard
- SSE streams: `curl -N https://aiolos.resonect.cz/__transmit/events?uid=x` (no
  Content-Encoding header)
- Row counts ≥ freeze-time counts; history intact in the dashboard

## Phase 5 — decommission (after ~1 week soak)

15. Delete `legacy.tf` + `user_data.sh` → `terraform apply` destroys the old
    instance/EIP/SG/IAM
16. Delete GitHub secrets: `RESONECT_AWS_PROD_*`, `AIOLOS_PROD_EC2_*`
17. Delete `infra/docker-compose.prod.yml.old`-era files: `infra/Caddyfile` and
    the root-level `infra/docker-compose.prod.yml` (old Caddy stack)
18. Remove this runbook or archive it in the PR description
