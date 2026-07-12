# CLAUDE.md

This file provides guidance to Claude Code when working with code in this
repository.

## Project Overview

Aiolos is a personal windsurfing/water-sports weather station for Vasiliki,
Greece, in **maintenance mode** — no new features, keep it working and up to
date.

Data flow: ESP32 station → cellular **plain HTTP** POST → `aiolos.resonect.cz`
(Cloudflare proxy) → AdonisJS API (SQLite via Prisma) → SSE
(`@adonisjs/transmit`) → React dashboard.

## Behavioral Guidelines

- **Simplicity first.** Minimum code that solves the problem. This is a hobby
  project — would a senior engineer call it overcomplicated? Simplify.
- **Surgical changes.** Touch only what the task requires; match existing style;
  don't refactor adjacent code unasked.
- **State assumptions.** If multiple interpretations exist, present them.
- **Verify before done.** Run the commands in Testing below; report real
  results, never claim untested things work.
- **Production is one push away** — see `.claude/rules/production-safety.md`.

## Repository Structure

| Path                         | What it is                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/adonis-api`            | AdonisJS 7 REST API + SSE. Prisma 7 on SQLite (better-sqlite3 driver adapter). Japa tests.     |
| `apps/react-frontend`        | React 19 + Vite 8 + Tailwind 4 (shadcn) dashboard. Talks to the API same-origin (`/api`, SSE). |
| `apps/bruno-api-control`     | Bruno API-client collection (open with the Bruno app). **Not** a pnpm workspace member.        |
| `packages/typescript-config` | Shared tsconfig presets (`@repo/typescript-config`).                                           |
| `firmware/`                  | ESP32 firmware — **PlatformIO + Arduino framework** (root `platformio.ini`). NOT ESP-IDF.      |
| `hardware/`                  | 3D-printable mount (`support_stand.3mf`).                                                      |
| `infra/`                     | Terraform (`infra/prod`, S3 state) + runtime compose/Traefik configs. See `infra/README.md`.   |

## Tech Stack

Node 24 · pnpm 11.1 (corepack) · Turborepo 2 · TypeScript 5.9 · oxlint + oxfmt
(no ESLint/Prettier) · AdonisJS 7 · Prisma 7 (SQLite) · React 19 · Vite 8 ·
Tailwind 4 · Zod 4 · Japa (backend tests) · Husky + lint-staged + commitlint ·
Renovate.

## Commands

```sh
pnpm install               # frozen lockfile in CI
pnpm dev                   # turbo: adonis serve --hmr + vite
pnpm build | lint | check-types | test
pnpm format                # oxfmt (format:check in hooks/CI)
pnpm --filter adonis-api exec prisma migrate dev    # create a migration
pnpm --filter adonis-api run seed                   # idempotent seeds
pio run -e aiolos-esp32dev # firmware build (needs firmware/secrets.ini)
docker compose -f infra/docker-compose.dev.yml up --build  # full stack on :80
```

The same commands are wrapped in the root `Taskfile.yml` (`task --list`) for
[go-task](https://taskfile.dev) users; the full Docker stack is `task dev:start`
/ `task dev:stop`.

## Testing

- Backend: `pnpm test` (Japa; bootstrap recreates `tmp/db.sqlite3` from the
  Prisma migrations each run). All tests must pass before committing backend
  changes.
- Frontend: no test suite yet — verify with `pnpm --filter react-frontend build`
  and by exercising the dashboard.

## Deployment

**Publishing a GitHub Release deploys production** (`deploy.yml` on
`release: published` with a `v*` tag: OIDC → ECR → SSM Run Command → docker
compose on the EC2 box). Merging to `main` does NOT deploy. The user releases
with `gh release create vX.Y.Z --generate-notes` — never create releases
yourself. Secrets live in AWS SSM under `/aiolos/prod/...`; nothing secret is in
the repo. Details and the box topology: `infra/README.md`.

## Rules

@.claude/rules/git-safety.md @.claude/rules/code-quality.md
@.claude/rules/production-safety.md

Path-scoped rules load automatically: `.claude/rules/database.md` (DB work),
`.claude/rules/firmware.md` (firmware work). Per-directory docs:
`apps/adonis-api/CLAUDE.md`, `infra/CLAUDE.md`, `firmware/CLAUDE.md`.
