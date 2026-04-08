## Why

`router-prompt.md` (11,118 chars) exceeds the Claude Code hook stdout cap of 10,000 characters. Every session start, the full content is replaced with a preview + file path, so the AI never sees the complete intent routing rules. This silently degrades intent classification quality.

## What Changes

- Trim `router-prompt.md` to a lean startup skeleton (< 10,000 chars) that covers session startup, intent category table, skill dispatch table, and a directive to invoke the `twinmind:router` skill for full routing rules.
- Create a new `twinmind:router` skill containing the detailed intent signal definitions, sub-intent resolution, classification priority, compound intent handling, and fuzzy fallback.
- Update `hooks/session-start.mjs` to output the trimmed `router-prompt.md` (no code logic change needed if file stays under 10K).

## Capabilities

### New Capabilities

- `router-skill`: The `twinmind:router` skill that holds the full intent routing rules, loaded on demand when the AI processes a knowledge-base input.

### Modified Capabilities

- `session-start-hook`: The hook output scenario changes from "outputs the full contents of `router-prompt.md`" to "outputs a trimmed skeleton that fits within the 10K stdout cap."
- `plugin-manifest`: `router-prompt.md` description changes from "full intent routing logic" to "startup skeleton with intent routing summary"; a new `skills/router/` directory is added to the plugin root layout.

## Impact

- **`router-prompt.md`**: Content split; detailed sections moved to the skill file. Character count must stay < 10,000.
- **`skills/router/SKILL.md`**: New file containing the extracted detailed routing rules.
- **`hooks/session-start.mjs`**: No code change needed (still reads and outputs `router-prompt.md`).
- **`hooks/hooks.json`**: No change.
- **Existing `twinmind:*` skills**: No change; they are still dispatched by the router.
- **User-facing behavior**: Functionally identical. The AI sees the same rules, just loaded in two stages (hook skeleton + on-demand skill) instead of one truncated blob.
