# Production Safety Rules

- **Merging to `main` deploys production immediately.** There is no staging —
  the PR checks are the last gate.
- Production is a single EC2 box; the SQLite file at `/opt/aiolos/data` is the
  only live data. Never suggest operations that recreate or wipe it.
- **Deployed ESP32 stations are the API's contract.** They POST plain HTTP to
  fixed routes (`POST /api/stations/:station_id/wind`, `/live/wind`,
  `/temperature`, `/diagnostics`, `GET /api/stations/:station_id/config`) at
  `aiolos.resonect.cz:80`. Never rename/remove these routes, change their
  response shapes, or introduce HTTP→HTTPS redirects on API paths — the devices
  are in the field and cannot be patched quickly.
- Cloudflare "Always Use HTTPS" must stay OFF for `aiolos.resonect.cz`.
- The API tests encode the device contract. Never rewrite a failing test to make
  a change pass — fix the change.
