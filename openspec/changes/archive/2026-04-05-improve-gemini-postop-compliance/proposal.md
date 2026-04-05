## Why

Gemini CLI post-op subagent produces non-compliant Home.md output (0/5 sections correct) despite the skill specification being identical to Claude Code's. Root cause: subagent is pinned to `gemini-2.5-flash` which lacks instruction-following precision, and no validation hook exists for Home.md/Dashboard.md format — allowing silent false-positive success reports.

## What Changes

- Remove explicit `model: gemini-2.5-flash` from `.gemini/agents/post-op.md` so the subagent inherits the session model (`gemini-3.1-pro-preview`) via Gemini CLI's default `inherit` behavior.
- Add a new validation hook `validate-home.js` that checks Home.md structural compliance after every write operation.
- Register the new hook in `.gemini/settings.json`.
- Inline Home.md and Dashboard.md format specifications with concrete examples directly into `.gemini/agents/post-op.md`, eliminating the need for the subagent to read SKILL.md for format details.

## Capabilities

### New Capabilities

- `home-dashboard-validation`: AfterTool hook that validates `vault/Home.md` and `vault/PARA/Dashboard.md` structural format after write operations. Checks section presence/order, wikilink syntax, emoji prefixes, and rejects non-spec content.

### Modified Capabilities

- `gemini-platform-support`: Remove `model` field from post-op agent definition to inherit session model instead of pinning to Flash.

## Impact

- `.gemini/agents/post-op.md` — YAML frontmatter change (remove `model` field)
- `.gemini/hooks/validate-home.js` — new file
- `.gemini/settings.json` — add hook registration
- No vault content changes. No Claude Code side changes.
