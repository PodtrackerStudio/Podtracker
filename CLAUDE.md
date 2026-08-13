# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Change log — read first, write last

This repo keeps a work log at [`docs/change-log.md`](docs/change-log.md). It
records what was changed in past sessions and, more importantly, *why*. Multiple
people work in this repo with Claude, so the log is the shared memory between
sessions.

**At the start of a session:** read the most recent entries in
`docs/change-log.md` before making changes. They describe the current state of
the project and decisions that are already settled.

**At the end of a session:** append one entry for the work you did, using the
template in that file. Newest entries go at the top of the `## Entries` section.
Record what actually happened, including anything abandoned, incomplete, or
left failing — the log is only useful if it is accurate.

One entry per unit of work (roughly per branch or per task), not one per commit.
Within a long session, amend the entry you already started rather than stacking
near-duplicate entries.

### This is enforced, not just requested

A `Stop` hook (`.claude/hooks/change-log-reminder.sh`, wired up in
`.claude/settings.json`) compares the files a session touched against
`docs/change-log.md`. If work happened and the log was not updated, it blocks
the session from ending and says what is missing.

It stays quiet when nothing changed, when the log is already part of the change
set, or when only `.claude/` config was touched. A `SessionStart` hook records
the starting commit in `.git/claude-session-base` so work that was committed and
pushed still counts — a clean working tree is not treated as an empty session.

The hooks are advisory infrastructure, not a substitute for judgment: they can
tell that the log went untouched, but not whether what you wrote in it is
accurate.
