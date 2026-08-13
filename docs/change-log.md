# Change Log

A running record of every change made to this repository by Claude, kept so that
any future session — with any user — can pick up the thread without re-deriving
what was already done and why.

This is **not** a release changelog for end users. It is a work log: what was
touched, why it was touched, and what was deliberately left alone. If you are
looking for user-facing release notes, that belongs in a separate `CHANGELOG.md`
at the repo root.

---

## How to use this file

**Before starting work:** read the most recent few entries. They tell you the
current state of the project, decisions that are already settled (don't
re-litigate them), and anything explicitly left as follow-up.

**After finishing work:** add one entry describing what you changed. One entry
per unit of work — roughly one entry per branch or per task, not one per commit
and not one per file.

**Ordering:** newest entry first, directly under the `## Entries` heading.
Reverse-chronological means the freshest context is the first thing read.

**Honesty rules** — the log is only worth reading if it can be trusted:

- Record what was *actually* done, not what was intended or planned.
- If something was attempted and abandoned, say so and say why. A dead end
  documented once saves the next session from walking into it.
- If work was left incomplete or a test was failing at hand-off, record it in
  **Follow-ups**. Never quietly omit it.
- Don't record speculative future work as if it were done.

---

## Entry template

Copy this block for each new entry.

```markdown
### YYYY-MM-DD — Short title of the change

- **Branch:** `branch-name`
- **Requested by:** who asked, and in one line, what they asked for
- **Status:** Complete | Partial | Reverted

**What changed**

- Bullet per meaningful change, written so it makes sense in six months.

**Files touched**

| File | Change |
| --- | --- |
| `path/to/file` | Added / Modified / Deleted — one-line description |

**Why**

Reasoning behind the approach, and any alternative that was considered and
rejected. This is the part that saves the most time later.

**Follow-ups**

- Anything left undone, known-broken, or deferred. Write "None." if there are
  none — an empty section is ambiguous, an explicit "None." is not.
```

---

## Entries

### 2026-08-13 — Established the change log

- **Branch:** `claude/change-log-documentation-mr4x5v`
- **Requested by:** sashaknyshjr@gmail.com — asked for a document recording all
  changes and edits made, so the record can be referenced in later sessions when
  other users work in this repo with Claude.
- **Status:** Complete

**What changed**

- Created this change log, with usage instructions, an entry template, and the
  conventions above.
- Added a root `CLAUDE.md` that points future sessions at this file and instructs
  them to read it before starting and append to it when finishing. Without that
  pointer the log would exist but would not reliably be read or updated.

**Files touched**

| File | Change |
| --- | --- |
| `docs/change-log.md` | Added — this file |
| `CLAUDE.md` | Added — repo guidance directing sessions to read/update this log |

**Why**

The repository was completely empty at the time of this entry: no commits on any
branch, no files, and no remote branches. There was therefore **no prior work to
document** — this entry is the start of the history rather than a summary of
anything that came before it. The log was set up now so that the record exists
from the first commit onward instead of being reconstructed later from commit
messages, which lose the reasoning behind decisions.

`docs/change-log.md` was chosen over a root-level `CHANGELOG.md` to keep this
work log distinct from a conventional user-facing release changelog, leaving that
filename free for its usual purpose.

**Follow-ups**

- None.
