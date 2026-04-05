## ADDED Requirements

### Requirement: Platform-appropriate hook timeout values

Hook timeout values in `.gemini/settings.json` SHALL use milliseconds (Gemini CLI's native unit) and MUST provide at least 30 seconds (30000ms) for Node.js hook execution. Hook timeout values in `.claude/settings.json` SHALL continue using seconds (Claude Code's native unit).

#### Scenario: Gemini hooks use millisecond timeout

- **WHEN** reading `.gemini/settings.json`
- **THEN** every hook entry has `"timeout": 30000` (30 seconds in milliseconds)

#### Scenario: Claude hooks remain unchanged

- **WHEN** reading `.claude/settings.json`
- **THEN** every hook entry retains `"timeout": 30` (30 seconds in seconds)

#### Scenario: Gemini hooks complete within timeout

- **WHEN** Gemini CLI executes any validation hook (validate-card, validate-inbox, validate-action, validate-project-files, validate-index)
- **THEN** the hook completes successfully without timeout errors
