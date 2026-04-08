## ADDED Requirements

### Requirement: SessionStart hook defined in hooks.json

The plugin SHALL define a `SessionStart` hook in `hooks/hooks.json` that executes `hooks/session-start.mjs` via Node.js.

#### Scenario: Hook definition format

- **WHEN** reading `hooks/hooks.json`
- **THEN** it contains a `SessionStart` array with a hook entry of `type: "command"` and `command` referencing `node ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.mjs`

### Requirement: SessionStart hook detects TwinMind.md

The `session-start.mjs` hook SHALL read the `cwd` field from stdin JSON, check if `TwinMind.md` exists at that path, and exit silently (code 0, no stdout) if it does not exist.

#### Scenario: Non-TwinMind project

- **WHEN** the hook runs in a directory without `TwinMind.md`
- **THEN** the hook exits with code 0 and produces no stdout output

#### Scenario: TwinMind project detected

- **WHEN** the hook runs in a directory containing `TwinMind.md`
- **THEN** the hook outputs the contents of `router-prompt.md` to stdout
- **AND** the stdout output is less than 10,000 characters

### Requirement: SessionStart hook is cross-platform

The `session-start.mjs` hook SHALL use only Node.js built-in modules and SHALL NOT use `/dev/stdin`, shell-specific features, or platform-specific paths. Stdin SHALL be read via `process.stdin` async iteration.

#### Scenario: Cross-platform stdin reading

- **WHEN** the hook reads stdin on Windows, macOS, or Linux
- **THEN** it successfully parses the JSON input using `process.stdin` async iteration

### Requirement: PostToolUse validation hooks in hooks.json

The plugin SHALL define `PostToolUse` hooks in `hooks/hooks.json` that execute the 5 validation scripts on `Write|Edit` tool use. All hook commands SHALL use `${CLAUDE_PLUGIN_ROOT}` for path resolution.

#### Scenario: Validation hooks defined

- **WHEN** reading `hooks/hooks.json`
- **THEN** it contains a `PostToolUse` array with matcher `Write|Edit` and 5 hook commands for validate-card.js, validate-inbox.js, validate-action.js, validate-project-files.js, and validate-index.js
- **AND** all commands use `${CLAUDE_PLUGIN_ROOT}/hooks/` prefix
