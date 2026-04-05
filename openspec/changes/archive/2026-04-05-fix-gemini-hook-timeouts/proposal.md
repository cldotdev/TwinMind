## Why

All 5 validation hooks in `.gemini/settings.json` have `timeout: 30`, which Gemini CLI interprets as 30 milliseconds. Node.js cold start alone takes 30-80ms, so every hook times out before it can even begin executing validation logic. This makes the entire hook-based validation system non-functional on Gemini CLI.

The root cause is a unit mismatch: Claude Code interprets `timeout` in seconds (30s), while Gemini CLI interprets it in milliseconds (30ms).

## What Changes

- Update all hook `timeout` values in `.gemini/settings.json` from `30` to `30000` (30 seconds) to match the intended behavior from `.claude/settings.json`
- No logic changes to the hook scripts themselves — they work correctly when given enough time to execute

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cross-platform-hooks`: Hook timeout configuration must use platform-appropriate units (seconds for Claude Code, milliseconds for Gemini CLI)

## Impact

- **Files modified**: `.gemini/settings.json`
- **Behavioral change**: Gemini CLI hooks will execute successfully instead of timing out
- **No breaking changes**: Hook scripts unchanged, only timeout configuration adjusted
- **Tool registration warnings**: `codebase_investigator`, `cli_help`, `generalist` duplicates are Gemini CLI built-in tools overwritten by extensions — not fixable at project level. `post-op` is an agent name collision during loading. These are cosmetic warnings with no functional impact and are out of scope.
