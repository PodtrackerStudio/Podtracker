#!/usr/bin/env bash
# Stop hook: refuse to end the session with unrecorded work.
#
# Compares the files this session touched against docs/change-log.md. If real
# work happened but the log was not updated, blocks the stop and tells Claude
# to write the entry. Silent when nothing changed, or when the log is already
# part of the change set.
set -uo pipefail

LOG_PATH="docs/change-log.md"

payload=$(cat)

# Already blocked once this turn — let the stop through so we cannot loop.
if [[ "$(printf '%s' "$payload" | jq -r '.stop_hook_active // false' 2>/dev/null)" == "true" ]]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

git_dir=$(git rev-parse --git-dir 2>/dev/null) || exit 0

# Uncommitted work: staged, unstaged, and untracked.
changed=$(
  {
    git diff --name-only 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u
)

# Work committed since the session started, so a commit-then-push flow is
# still caught. Missing baseline (hook added mid-session) just means we fall
# back to the working tree alone.
base_file="$git_dir/claude-session-base"
if [[ -s "$base_file" ]]; then
  base=$(<"$base_file")
  base=${base//[$'\t\r\n ']/}
  if [[ -n "$base" ]] && git cat-file -e "$base^{commit}" 2>/dev/null; then
    committed=$(git diff --name-only "$base"..HEAD 2>/dev/null)
    changed=$(printf '%s\n%s\n' "$changed" "$committed" | sort -u)
  fi
fi

changed=$(printf '%s' "$changed" | grep -v '^$' || true)

# Nothing happened — nothing to record.
[[ -z "$changed" ]] && exit 0

# The log itself was updated. Good enough.
if printf '%s\n' "$changed" | grep -qxF "$LOG_PATH"; then
  exit 0
fi

# Changes that are only to Claude's own config aren't project work worth logging.
substantive=$(printf '%s\n' "$changed" | grep -v '^\.claude/' || true)
[[ -z "$substantive" ]] && exit 0

file_list=$(printf '%s\n' "$substantive" | head -20 | sed 's/^/  - /')

jq -n --arg files "$file_list" --arg log "$LOG_PATH" '{
  decision: "block",
  reason: (
    "This session changed files but did not update \($log).\n\n" +
    "Files touched:\n\($files)\n\n" +
    "Append an entry to \($log) now, using the template in that file. " +
    "Newest entry goes at the top of the \"## Entries\" section. Record what " +
    "actually happened, including anything abandoned, incomplete, or left " +
    "failing. Then commit it alongside the work."
  )
}'

exit 0
