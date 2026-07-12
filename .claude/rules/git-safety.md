# Git Safety Rules

**CRITICAL - Branch Protection:**

- **NEVER push directly to `main`** — main must only move via reviewed PRs; it
  is what production releases are cut from
- **ALWAYS work on feature/fix branches** and merge via Pull Request
- Branch naming: `feat/description`, `fix/description`, `chore/description`

**CRITICAL - Push & Release Restrictions:**

- **NEVER push to remote repositories** — only commit locally
- **ALWAYS let the user push manually** — the user controls when changes go to
  remote
- **NEVER create or publish a GitHub Release** — publishing a release (`v*` tag)
  deploys production (deploy.yml); only the user releases

**Commit Conventions:**

- Conventional Commits: `type(scope?): subject`
- Types: feat, fix, chore, docs, test, refactor, perf, cicd, build, style,
  revert
- Scopes kebab-case (e.g., `frontend`, `backend`, `firmware`, `infra`)
- Header ≤ 100 chars, no trailing period
- Commitlint validates locally (Husky) and in CI; use "Squash and merge" on PRs
- If a pre-commit hook fails, fix the issue and create a NEW commit; never
  `--no-verify` unless the user explicitly asks
