# Code Quality Rules

**Toolchain:**

- Linting is **oxlint** (per-app `.oxlintrc.json`), formatting is **oxfmt**
  (root `.oxfmtrc.json`). **Never** re-introduce ESLint or Prettier.
- Run `pnpm format` before committing — the pre-commit hook only CHECKS
  formatting (it never rewrites your staged files).
- `pnpm exec turbo run lint check-types` must be clean before a PR.

**TypeScript:**

- The backend build uses `--ignore-ts-errors`, so type errors do NOT fail builds
  — `check-types` is the real gate; keep it green.
- The frontend extends `@repo/typescript-config` (strict,
  `noUncheckedIndexedAccess`); handle possibly-undefined index access rather
  than sprinkling `!`.

**General:**

- No `any` creep — prefer `unknown` + narrowing.
- Match the existing module style (ESM, `#` subpath imports in the backend).
