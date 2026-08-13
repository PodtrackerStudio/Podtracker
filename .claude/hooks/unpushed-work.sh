#!/usr/bin/env bash
# Stop hook: refuse to end the session with work that hasn't reached the repo.
#
# Sasha's standing instruction is that every change goes to GitHub — a
# collaborator works in this repo and can only see what was pushed. This blocks
# the stop when there are commits not on any remote, or uncommitted changes in
# the working tree. Silent when everything is pushed.
#
# Deliberately does NOT use jq: it is not installed on Sasha's Windows machine,
# and a hook that depends on a missing binary fails silently and enforces
# nothing. JSON is emitted by hand instead.
set -uo pipefail

payload=$(cat)

# Already blocked once this turn — let the stop through so we cannot loop.
if printf '%s' "$payload" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# No remote configured — nothing to push to, so nothing to enforce.
[[ -n "$(git remote 2>/dev/null)" ]] || exit 0

# No commits yet (fresh repo) — nothing to compare.
git rev-parse HEAD >/dev/null 2>&1 || exit 0

# Commits that exist on no remote branch. Uses local remote-tracking refs, which
# git updates on push, so this is accurate without a network round-trip.
unpushed=$(git rev-list --count HEAD --not --remotes 2>/dev/null || echo 0)

# Uncommitted work: staged, unstaged, and untracked-but-not-ignored.
dirty=$(
  {
    git diff --name-only 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u | grep -v '^$' || true
)

# Everything is on the remote and the tree is clean.
[[ "$unpushed" -eq 0 && -z "$dirty" ]] && exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

detail=""
if [[ "$unpushed" -gt 0 ]]; then
  commits=$(git log --oneline HEAD --not --remotes 2>/dev/null | head -10 | sed 's/^/  /')
  detail+="Unpushed commits on ${branch} (${unpushed}):"$'\n'"${commits}"$'\n\n'
fi
if [[ -n "$dirty" ]]; then
  files=$(printf '%s\n' "$dirty" | head -15 | sed 's/^/  - /')
  detail+="Uncommitted changes:"$'\n'"${files}"$'\n\n'
fi

reason="Work has not reached the repo. The standing instruction in CLAUDE.md is that every change gets committed and pushed — a collaborator works in this repo and can only see what was pushed."$'\n\n'"${detail}"'Commit anything outstanding and run `git push`. If a change is deliberately being left unfinished, say so explicitly to the user rather than pushing it.'

# Minimal JSON string escaping: backslash, double quote, then control chars.
escaped=$reason
escaped=${escaped//\\/\\\\}
escaped=${escaped//\"/\\\"}
escaped=${escaped//$'\r'/}
escaped=${escaped//$'\t'/\\t}
escaped=${escaped//$'\n'/\\n}

printf '{"decision":"block","reason":"%s"}\n' "$escaped"

exit 0
