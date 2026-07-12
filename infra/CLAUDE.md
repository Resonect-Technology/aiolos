# infra/

Production topology, deploy flow and Terraform usage: see `README.md` in this
directory.

Rules of thumb for agents:

- **Never run `terraform apply` or destroy operations** — plan/validate/tflint
  only; the user applies.
- **Public repo** — never commit account IDs, the SSO start URL, the reserved
  EIP, Cloudflare zone/tokens, or Terraform state. Secrets/config live in SSM;
  the EIP lives only in `firmware/secrets.ini` (gitignored).
- `infra/prod` state lives in the shared S3 backend
  (`resonect-terraform-state-211125605653`, key `projects/aiolos/...`); AWS
  access is via SSO profiles `resonect-prod` (+ `resonect-master` for the
  backend). Never ask for or handle static AWS keys.
- Secrets are SSM parameters under `/aiolos/...` with `ignore_changes = [value]`
  — values are set with `aws ssm put-parameter --overwrite`, never in git.
- Stations POST plain HTTP to the reserved Elastic IP on :80 (raw IP, no
  hostname). The host-agnostic `api-http` router in
  `prod/docker-compose.prod.yml` (no redirect on `/api`, SSE uncompressed) is
  production API surface — treat it as such.
- History note: an early `terraform.tfstate` exists in old git history (removed
  in `aaf7317`; resource IDs only, no credentials).
