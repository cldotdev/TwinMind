## MODIFIED Requirements

### Requirement: Plugin root directory layout

The plugin root SHALL contain the following top-level directories: `skills/`, `hooks/`, `scripts/`, `templates/`. No `.claude/` directory SHALL exist at the plugin root.

#### Scenario: Directory structure validation

- **WHEN** listing the plugin root directory
- **THEN** directories `skills/`, `hooks/`, `scripts/`, `templates/`, `.claude-plugin/` exist
- **AND** `skills/` contains a `router/` subdirectory with `SKILL.md`
- **AND** no `.claude/` directory exists
- **AND** no `CLAUDE.md` file exists

### Requirement: Router prompt file

The plugin root SHALL contain a `router-prompt.md` file with the session startup procedure, intent category summary table, skill dispatch table, and a directive to invoke the `twinmind:router` skill for detailed classification rules. The file SHALL be less than 10,000 characters.

#### Scenario: Router prompt exists and is within size limit

- **WHEN** reading `router-prompt.md` at the plugin root
- **THEN** the file exists and contains the intent routing table with all 9 intent categories
- **AND** the file contains a directive to invoke `twinmind:router` for full classification rules
- **AND** the file character count is less than 10,000
