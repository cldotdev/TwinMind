## ADDED Requirements

### Requirement: Relative path hook invocation

All hook commands in `.claude/settings.json` and `.gemini/settings.json` SHALL use relative paths (e.g., `node .claude/hooks/validate-card.js`) instead of shell variable expansion (e.g., `node "$CLAUDE_PROJECT_DIR/..."`).

#### Scenario: Claude settings uses relative path

- **WHEN** reading `.claude/settings.json`
- **THEN** every hook command uses `node .claude/hooks/<script>.js` without `$CLAUDE_PROJECT_DIR`

#### Scenario: Gemini settings uses relative path

- **WHEN** reading `.gemini/settings.json`
- **THEN** every hook command uses `node .gemini/hooks/<script>.js` without environment variable expansion

#### Scenario: Hook executes on Windows PowerShell

- **WHEN** Gemini CLI executes a hook command on Windows (PowerShell)
- **THEN** the relative path resolves correctly because the CWD is the project root

### Requirement: Platform-specific hookEventName in Gemini hooks

The `.gemini/hooks/*.js` scripts SHALL output `hookEventName: 'AfterTool'` in their JSON response, while `.claude/hooks/*.js` scripts retain `hookEventName: 'PostToolUse'`.

#### Scenario: Gemini hook outputs correct event name

- **WHEN** a `.gemini/hooks/*.js` script executes successfully
- **THEN** the JSON output contains `hookEventName: 'AfterTool'`

#### Scenario: Claude hook outputs correct event name

- **WHEN** a `.claude/hooks/*.js` script executes successfully
- **THEN** the JSON output contains `hookEventName: 'PostToolUse'` (unchanged)

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
