## ADDED Requirements

### Requirement: Setup skill exists

The plugin SHALL include a `skills/setup/SKILL.md` skill that initializes a new TwinMind vault in the current working directory.

#### Scenario: Skill file exists

- **WHEN** listing `skills/setup/`
- **THEN** `SKILL.md` exists with frontmatter containing `name` and `description`

### Requirement: Setup checks project cleanliness

The setup skill SHALL check for existing `TwinMind.md`, existing vault directory, and old-style `.claude/skills/tm-*` directories before proceeding. If any exist, it SHALL warn the user and ask for confirmation.

#### Scenario: Clean directory

- **WHEN** the current directory has no `TwinMind.md`, no vault directory, and no `.claude/skills/tm-*`
- **THEN** setup proceeds without warnings

#### Scenario: Existing TwinMind.md

- **WHEN** `TwinMind.md` already exists in the current directory
- **THEN** setup warns "TwinMind.md already exists" and asks the user whether to overwrite or abort

#### Scenario: Old installation detected

- **WHEN** `.claude/skills/tm-capture/` exists in the current directory
- **THEN** setup warns about old-style installation and recommends cleaning up before proceeding

### Requirement: Setup creates TwinMind.md from template

The setup skill SHALL copy `templates/TwinMind.md` to the project root and allow the user to customize `vault_dir`, `locale`, and `domains` interactively.

#### Scenario: Default setup

- **WHEN** user accepts all defaults during setup
- **THEN** `TwinMind.md` is created at project root with default values from the template

### Requirement: Setup scaffolds vault directory

The setup skill SHALL create the vault directory structure from `templates/vault/`, including `System/`, `Cards/`, `Sources/`, `Atlas/`, `PARA/Inbox/`, `PARA/Actions/`, `PARA/Projects/`, `PARA/Areas/`, `PARA/Tasks/`, `PARA/Archive/`, and initial files (`vault-index.json`, `INDEX_SCHEMA.md`, `Home.md`, `Dashboard.md`, `Projects/_index.md`, `Areas/_index.md`, `Tasks/tasks.md`).

#### Scenario: Vault scaffold

- **WHEN** setup completes with `vault_dir: vault`
- **THEN** the directory `vault/` exists with subdirectories `System/`, `Cards/`, `Sources/`, `Atlas/`, `PARA/Inbox/`, `PARA/Actions/`, `PARA/Projects/`, `PARA/Areas/`, `PARA/Tasks/`, `PARA/Archive/`
- **AND** `vault/System/vault-index.json` and `vault/System/INDEX_SCHEMA.md` exist
- **AND** `vault/Home.md` and `vault/PARA/Dashboard.md` exist
- **AND** `vault/PARA/Projects/_index.md`, `vault/PARA/Areas/_index.md`, and `vault/PARA/Tasks/tasks.md` exist

### Requirement: Template TwinMind.md

The `templates/TwinMind.md` file SHALL contain YAML frontmatter with all supported configuration keys set to sensible defaults, and a Markdown body section with brief documentation of each setting.

#### Scenario: Template frontmatter

- **WHEN** reading `templates/TwinMind.md`
- **THEN** it contains YAML frontmatter with at minimum `vault_dir`, `locale`, `domains`, `moc_threshold_create`, `moc_threshold_split`, `default_card_type`, `memo_stale_days`, `action_stale_days`
