## ADDED Requirements

### Requirement: Plugin manifest exists at `.claude-plugin/plugin.json`

The plugin SHALL have a `.claude-plugin/plugin.json` manifest with `name`, `description`, and `version` fields. The `name` field SHALL be `"twinmind"`.

#### Scenario: Valid plugin manifest

- **WHEN** Claude Code reads `.claude-plugin/plugin.json`
- **THEN** it contains valid JSON with `name` set to `"twinmind"`, a `description` string, and a semantic `version` string

### Requirement: Plugin root directory layout

The plugin root SHALL contain the following top-level directories: `skills/`, `hooks/`, `scripts/`, `templates/`. No `.claude/` directory SHALL exist at the plugin root.

#### Scenario: Directory structure validation

- **WHEN** listing the plugin root directory
- **THEN** directories `skills/`, `hooks/`, `scripts/`, `templates/`, `.claude-plugin/` exist
- **AND** no `.claude/` directory exists
- **AND** no `CLAUDE.md` file exists

### Requirement: Router prompt file

The plugin root SHALL contain a `router-prompt.md` file with the full intent routing logic (session startup, intent classification, skill dispatch table, subagent protocol).

#### Scenario: Router prompt exists and is non-empty

- **WHEN** reading `router-prompt.md` at the plugin root
- **THEN** the file exists and contains the intent routing table with all 9 intent categories (CAPTURE, INBOX, ACTION, TASK, PROJECT, AREA, QUERY, REVIEW, CONNECT)

### Requirement: No external runtime dependencies

The plugin SHALL NOT require any npm packages or external dependencies. All scripts and hooks SHALL use only Node.js built-in modules (`fs`, `path`, `os`, `url`, `crypto`).

#### Scenario: No package.json with dependencies

- **WHEN** checking the plugin root for `package.json`
- **THEN** either no `package.json` exists, or it contains no `dependencies` or `devDependencies` entries

### Requirement: OpenSpec files excluded from version control

The `.gitignore` SHALL exclude `.claude/skills/openspec-*/` and `.claude/commands/opsx/` patterns to prevent externally-installed OpenSpec files from being committed.

#### Scenario: OpenSpec patterns in gitignore

- **WHEN** reading `.gitignore`
- **THEN** it contains patterns that exclude `.claude/skills/openspec-*/` and `.claude/commands/opsx/`
