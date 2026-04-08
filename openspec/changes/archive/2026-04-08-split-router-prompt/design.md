## Context

`router-prompt.md` is injected into every Claude Code session via the `SessionStart` hook's stdout. At 11,118 characters it exceeds the 10,000-character hook stdout cap. The overflow triggers Claude Code's large-output handling: the full text is saved to a temp file and replaced with a preview + path. The AI sees a truncated version and never reads the temp file, so intent routing rules are incomplete from session start.

Current `router-prompt.md` subsection sizes:

| Subsection | Chars | Lines |
|---|---|---|
| Header + Session startup | 1,839 | 1-58 |
| Intent category table | 565 | 59-76 |
| Signal words & patterns | 2,628 | 77-180 |
| Sub-intent resolution | 795 | 181-250 |
| Classification priority | 243 | 251-264 |
| Compound intent handling | 259 | 265-280 |
| Fuzzy intent fallback | 1,050 | 281-307 |
| Plan Mode check | 365 | 308-317 |
| Post-op rules | 610 | 318-333 |
| Subagent delegation protocol | 1,909 | 334-380 |
| Hook auto-validation | 845 | 381-396 |
| **Total** | **11,118** | |

## Goals / Non-Goals

**Goals:**

- Ensure the AI sees the complete intent routing rules every session.
- Stay within the 10,000-character hook stdout cap with margin.
- Preserve identical user-facing behavior (same intent classification, same skill dispatch).

**Non-Goals:**

- Rewriting or restructuring the routing rules themselves.
- Changing the SessionStart hook's detection logic or cross-platform behavior.
- Modifying any existing `twinmind:*` skill.

## Decisions

### Decision 1: Split into hook skeleton + on-demand skill

**Choice**: Keep `router-prompt.md` as a lean skeleton (< 10K chars) and move detailed classification rules into a new `twinmind:router` skill.

**Alternative considered**: Trim content in-place to fit under 10K. Rejected because the margin is only ~1,100 chars — any future addition would breach the cap again. The skill approach provides unlimited growth room.

**Alternative considered**: Use CLAUDE.md `@import` instead of hook. Rejected because CLAUDE.md loads based on cwd directory tree — the plugin directory's CLAUDE.md would not load when the user works in their vault directory. The hook is the only mechanism that runs from the plugin path regardless of cwd.

### Decision 2: What stays in the skeleton vs. what moves to the skill

**Skeleton keeps** (operational rules the AI needs from session start):

| Section | Chars | Reason |
|---|---|---|
| Header + Session startup (Steps 1-5) | 1,839 | Must execute before any user input |
| Intent category table (9 categories) | 565 | Quick-reference for initial classification |
| Skill Dispatch table + Plan Mode check | 365 | Needed to route to correct skill |
| Post-op rules | 610 | Needed after every write operation |
| Subagent delegation protocol | 1,909 | Defines execution model for all skills |
| Hook auto-validation | 845 | Describes automatic PostToolUse behavior |
| Markdown caveats | 185 | Applies to all write operations |
| Router skill directive + caching hint | ~225 | Tells AI to invoke `twinmind:router`; once per session |
| **Skeleton total** | **~7,189** | 28% headroom under 10K cap |

**Skill receives** (detailed classification logic, loaded on demand):

| Section | Chars | Reason |
|---|---|---|
| Signal words & patterns (all 9 intents) | 2,628 | Only needed during intent classification |
| Sub-intent resolution | 795 | Only needed during intent classification |
| Classification priority | 243 | Only needed during intent classification |
| Compound intent handling | 259 | Only needed during intent classification |
| Fuzzy intent fallback | 1,050 | Only needed during intent classification |
| **Skill total** | **~4,975** | + skill frontmatter |

**Rationale**: The skeleton contains everything the AI needs to start a session and operate the system. The skill contains everything the AI needs to classify a specific user input. This is a natural boundary — session-level vs. input-level.

### Decision 3: Router skill invocation trigger

**Choice**: The skeleton includes a directive: "When classifying intent for a knowledge-base input, invoke `twinmind:router` first to load the full classification rules, then dispatch to the appropriate `twinmind:*` skill." A session-level caching hint tells the AI that once loaded, the skill does not need to be re-invoked within the same session.

This means the first knowledge-base interaction in a session has two skill loads: router (classify) then domain skill (execute). Subsequent interactions skip the router load. This adds one tool call per session but ensures the AI always has fresh, complete rules — surviving context compression and `/compact`.

### Decision 4: Skill file location

**Choice**: `skills/router/SKILL.md` following the existing pattern (`skills/<name>/SKILL.md`).

The skill `name` in frontmatter is `router` and the `description` must contain the trigger signals so Claude Code knows when to suggest it: intent classification, knowledge-base input routing.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| AI forgets to invoke `twinmind:router` before classifying | The skeleton includes an explicit directive. The skill `description` contains trigger words matching knowledge-base inputs. |
| Extra latency from two-stage skill loading | One additional tool call per session (cached after first load). Acceptable trade-off for guaranteed completeness. |
| Future skeleton growth breaches 10K again | 28% headroom (~2,800 chars). Monitor with `wc -m router-prompt.md`. |
| Skill content diverges from skeleton | Both files live in the same repo. The skeleton references the skill by name; no content duplication. |
