# infra/

Production topology, deploy flow and Terraform usage: see `README.md` in this
directory. Cutover runbook (old box → new box): `prod/CUTOVER.md`.

Rules of thumb for agents:

- **Never run `terraform apply` or destroy operations** — plan/validate/tflint
  only; the user applies.
- `infra/prod` state lives in the shared S3 backend
  (`resonect-terraform-state-211125605653`, key `projects/aiolos/...`); AWS
  access is via SSO profiles `resonect-prod` (+ `resonect-master` for the
  backend). Never ask for or handle static AWS keys.
- Secrets are SSM parameters under `/aiolos/...` with `ignore_changes = [value]`
  — values are set with `aws ssm put-parameter --overwrite`, never in git.
- `legacy.tf` is the old stack awaiting decommission — don't "clean it up".
- Traefik routing labels in `prod/docker-compose.prod.yml` encode the plain-HTTP
  device contract (no redirect on API paths, SSE uncompressed). Treat them as
  production API surface.
- History note: an early `terraform.tfstate` exists in old git history (removed
  in `aaf7317`; resource IDs only, no credentials).
