## Context

The Gemini CLI post-op subagent is pinned to `gemini-2.5-flash` in `.gemini/agents/post-op.md`. This weaker model produces non-compliant Home.md output (wrong structure, markdown links instead of wikilinks, missing sections) but reports success because no validation hook exists for Home.md or Dashboard.md.

Gemini CLI subagents default to `model: inherit` when the field is omitted, inheriting the session model from `settings.json` (currently `gemini-3.1-pro-preview`).

Existing hooks validate Cards, Sources, Inbox, Actions, Project files, and vault-index.json, but Home.md and Dashboard.md have no format validation.

## Goals / Non-Goals

**Goals:**

- Inherit session model for post-op subagent by removing the explicit `model` pin
- Prevent false-positive success reports by validating Home.md structure after writes
- Catch format violations at write time so the subagent can retry

**Non-Goals:**

- Validating Dashboard.md format (can be added later with the same pattern)
- Modifying the post-op SKILL.md content
- Changing any Claude Code configuration

## Decisions

### D1: Remove `model` field entirely (not change its value)

Omitting the `model` field triggers Gemini CLI's default `inherit` behavior. This is cleaner than setting `model: inherit` explicitly because it matches how `link-inference.md` already works (no model field, inherits session model).

Alternative: Set `model: gemini-3.1-pro-preview` explicitly. Rejected because it creates a maintenance burden when the session model changes.

### D2: Validate Home.md via structural section checks

The hook validates:

1. Presence of exactly 5 H2 sections in the correct order
2. Wikilink syntax `[[...]]` in content sections (not markdown `[...](...)`)
3. Emoji prefixes in the "recent" section
4. Absence of non-spec sections

The hook reads the written file content and checks against these structural rules. It does NOT validate data correctness (e.g., whether the listed cards actually exist in the index) - that would require reading vault-index.json and is out of scope for a fast write hook.

Alternative: Full content validation against vault-index.json. Rejected - too slow for a hook, and data correctness is a different class of problem than format compliance.

### D3: Single hook file for Home.md only

One focused hook file `validate-home.js` for Home.md. Dashboard.md validation can be added as a separate hook later.

Alternative: Combined `validate-derived.js` for both Home.md and Dashboard.md. Rejected because Dashboard validation adds scope and complexity; better to ship Home.md validation first and iterate.

### D5: Inline format specs and examples into post-op.md

Embed the complete Home.md 5-section specification, a concrete example output, and a prohibition list directly into `.gemini/agents/post-op.md`. Same treatment for Dashboard.md.

The subagent sees the format in its initial prompt without needing to `read_file` any external spec. This addresses the root cause: the original failure was the subagent not reading SKILL.md and generating a freeform format.

Alternative: Create a separate template file and reference it from post-op.md. Rejected because adding another file to read reintroduces the same indirection problem.

### D4: Same matcher as existing hooks

Register under the same `write_file|replace` matcher used by all existing hooks. The hook checks path internally and skips non-matching files, consistent with the pattern in validate-card.js and others.

## Risks / Trade-offs

- [Model upgrade may increase latency] -> Post-op is a small task (4 steps); Pro should complete within the existing 3-minute timeout. Monitor if needed.
- [Hook may be too strict, blocking valid edge cases] -> Start with structural checks only (section presence/order, syntax patterns). Avoid content-level validation.
- [Flash worked for changelog/MOC but not Home.md] -> Model upgrade affects all post-op steps. This is acceptable since Pro handles all steps correctly.
