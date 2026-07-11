---
name: create-pr
description: Create a GitHub pull request following Aiolos project conventions
disable-model-invocation: true
---

Create a pull request with `gh`. Follow these steps:

1. **Verify branch** - Never PR from `main`. If needed, create a branch
   (`feat/...`, `fix/...`, `chore/...`) and move the commits there.

2. **Review the full delta** - `git log main..HEAD --oneline` and
   `git diff main...HEAD --stat`. The PR describes ALL commits, not just the
   latest.

3. **Verify locally before opening**:

   ```bash
   pnpm format:check && pnpm exec turbo run lint check-types test
   ```

4. **Push the branch** (branch push is fine — only `main` is off-limits):

   ```bash
   git push -u origin <branch>
   ```

5. **Create the PR**:

   ```bash
   gh pr create --title "type(scope): subject" --body "$(cat <<'EOF'
   ## Summary
   - what changed and why

   ## Testing
   - how it was verified
   EOF
   )"
   ```

**Rules:**

- PR titles follow Conventional Commits (they become the squash commit header)
- **Merging to main deploys production** — say so in the PR body when the change
  affects the running service, the device API contract, or the DB
- Use "Squash and merge"
