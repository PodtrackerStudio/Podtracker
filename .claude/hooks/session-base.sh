#!/usr/bin/env bash
# SessionStart hook: record the commit the session started from.
#
# The Stop hook compares against this to work out which files this session
# actually touched. Stored inside .git/ so it is never committed and never
# shows up in git status.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

git rev-parse --git-dir >/dev/null 2>&1 || exit 0

git_dir=$(git rev-parse --git-dir 2>/dev/null) || exit 0
head=$(git rev-parse HEAD 2>/dev/null) || head=""

printf '%s\n' "$head" > "$git_dir/claude-session-base" 2>/dev/null || true

exit 0
