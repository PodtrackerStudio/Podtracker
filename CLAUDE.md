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
