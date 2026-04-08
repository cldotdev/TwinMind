## MODIFIED Requirements

### Requirement: SessionStart hook detects TwinMind.md

The `session-start.mjs` hook SHALL read the `cwd` field from stdin JSON, check if `TwinMind.md` exists at that path, and exit silently (code 0, no stdout) if it does not exist.

#### Scenario: Non-TwinMind project

- **WHEN** the hook runs in a directory without `TwinMind.md`
- **THEN** the hook exits with code 0 and produces no stdout output

#### Scenario: TwinMind project detected

- **WHEN** the hook runs in a directory containing `TwinMind.md`
- **THEN** the hook outputs the contents of `router-prompt.md` to stdout
- **AND** the stdout output is less than 10,000 characters
