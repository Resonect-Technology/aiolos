---
name: commit
description:
  Create a well-formatted git commit following Aiolos project conventions
disable-model-invocation: true
---

Create a git commit following project conventions. Follow these steps:

1. **Check status and diff** - Run `git status` (never use -uall) and `git diff`
   to see all changes. Also run `git log --oneline -5` to see recent commit
   message style.

2. **Stage files** - Add specific files by name (prefer over `git add -A`).
   Never commit files containing secrets (.env, secrets.ini, terraform.tfvars).

3. **Draft commit message** using Conventional Commits format:
   - Format: `type(scope?): subject`
   - Types: feat, fix, chore, docs, test, refactor, perf, cicd, build, style,
     revert
   - Scopes use kebab-case (e.g., `frontend`, `backend`, `firmware`, `infra`)
   - Header max 100 characters, no trailing period
   - Focus on "why" not "what"

4. **Create the commit** using HEREDOC for proper formatting:

   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): subject

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

5. **Verify** - Run `git status` to confirm success.

**Rules:**

- NEVER push to remote - let the user push manually
- NEVER amend previous commits unless explicitly asked
- If the pre-commit hook fails, fix the issue and create a NEW commit
- NEVER use `--no-verify` unless the user explicitly requests it
