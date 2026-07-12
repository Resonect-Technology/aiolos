# Copilot Instructions

**All AI instructions for this repository live in [CLAUDE.md](../CLAUDE.md)**
(plus `.claude/rules/` and per-directory CLAUDE.md files). Read that first.

The five most load-bearing facts:

1. **Publishing a GitHub Release (`v*` tag) deploys production.** Never push to
   main directly, and never create releases — only the user releases.
2. Deployed ESP32 stations POST **plain HTTP** to fixed API routes at
   `aiolos.resonect.cz:80` — never rename these routes, change response shapes,
   or add HTTP→HTTPS redirects on API paths.
3. Toolchain: Node 24, pnpm 11, Turborepo 2, **oxlint + oxfmt** (never re-add
   ESLint/Prettier). Verify with
   `pnpm format:check && pnpm exec turbo run lint check-types test`.
4. Backend is AdonisJS 7 + **Prisma 7 on SQLite**; wind timestamps are UTC ISO
   strings by design; migrations additive; seeds idempotent.
5. Commits follow Conventional Commits (commitlint-enforced, kebab-case scopes).
