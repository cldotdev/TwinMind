## ADDED Requirements

### Requirement: Gemini CLI directory structure

The system SHALL provide a `.gemini/` directory containing settings.json, hooks/, skills/, and agents/ subdirectories that mirror the `.claude/` structure.

#### Scenario: Gemini CLI discovers project configuration

- **WHEN** a user launches `gemini` in the TwinMind project root
- **THEN** Gemini CLI loads `.gemini/settings.json` and registers all hooks

#### Scenario: Directory structure matches Claude layout

- **WHEN** comparing `.gemini/` to `.claude/`
- **THEN** `.gemini/hooks/` contains the same 5 validator JS files as `.claude/hooks/`
- **AND** `.gemini/skills/` contains SKILL.md files for all 11 `tm-*` skills (OpenSpec skills excluded)

### Requirement: Gemini settings.json with AfterTool hooks

The system SHALL provide a `.gemini/settings.json` that configures AfterTool hooks matching the validation behavior of Claude Code's PostToolUse hooks.

#### Scenario: Hook triggers on file write

- **WHEN** Gemini CLI executes a `write_file` or `replace` tool call targeting `Cards/*.md`
- **THEN** the `validate-card.js` hook executes and validates frontmatter

#### Scenario: Hook triggers on index write

- **WHEN** Gemini CLI executes a `write_file` or `replace` tool call targeting `vault-index.json`
- **THEN** the `validate-index.js` hook executes and validates all 9 consistency invariants

### Requirement: Gemini skills with adapted tool names

Each `.gemini/skills/tm-*/SKILL.md` SHALL contain the same operational logic as the corresponding `.claude/skills/tm-*/SKILL.md`, with all Claude Code tool names replaced by their Gemini CLI equivalents: Read -> read_file, Write -> write_file, Edit -> replace, Grep -> grep_search, Glob -> glob, Bash -> run_shell_command.

#### Scenario: Skill references correct Gemini tools

- **WHEN** reading any `.gemini/skills/tm-*/SKILL.md`
- **THEN** it contains no references to Claude Code tool names (Read, Write, Edit, Grep, Bash as tool names)
- **AND** it uses Gemini CLI tool names (read_file, write_file, replace, grep_search, run_shell_command)

#### Scenario: Skill activates successfully

- **WHEN** a user runs `/skills list` in Gemini CLI
- **THEN** all 11 `tm-*` skills appear in the list with correct names and descriptions

### Requirement: GEMINI.md with intent routing

The system SHALL provide a GEMINI.md at the project root containing the same intent routing logic as CLAUDE.md, adapted for Gemini CLI tool names and subagent behavior.

#### Scenario: GEMINI.md loaded at session start

- **WHEN** a user launches `gemini` in the TwinMind project root
- **THEN** Gemini CLI loads GEMINI.md as project-level instructions

#### Scenario: Intent routing dispatches to correct skill

- **WHEN** a user says "Rust 的所有權機制是..."
- **THEN** the AI classifies intent as CAPTURE and activates the `tm-capture` skill

#### Scenario: Subagent behavior adapted

- **WHEN** GEMINI.md describes post-op subagent behavior
- **THEN** it specifies foreground (synchronous) execution, not background

### Requirement: Gemini subagent definitions

The system SHALL provide `.gemini/agents/post-op.md` and `.gemini/agents/link-inference.md` as formal subagent definitions with YAML frontmatter specifying model, tools, max_turns, and timeout_mins.

#### Scenario: Post-op agent definition

- **WHEN** reading `.gemini/agents/post-op.md`
- **THEN** it contains YAML frontmatter with name, description, model (gemini-2.5-flash), tools list (read_file, write_file, replace, glob), max_turns, and timeout_mins
- **AND** the body contains the post-op pipeline instructions adapted from `tm-post-op` SKILL.md

#### Scenario: Link-inference agent definition

- **WHEN** reading `.gemini/agents/link-inference.md`
- **THEN** it contains YAML frontmatter with name, description, tools list (read_file, glob), max_turns, and timeout_mins
- **AND** the body contains link inference instructions adapted from `tm-capture` SKILL.md's link-inference section

#### Scenario: Agents discoverable by Gemini CLI

- **WHEN** a user runs `/agents list` in Gemini CLI
- **THEN** both `post-op` and `link-inference` agents appear in the list

### Requirement: Foreground post-op execution in Gemini skills

All Gemini-version `tm-*` SKILL.md files that trigger post-op SHALL instruct the AI to call the post-op subagent synchronously (foreground) and wait for completion before responding to the user.

#### Scenario: Capture skill runs post-op synchronously

- **WHEN** `tm-capture` completes card creation in Gemini CLI
- **THEN** the skill invokes the `post-op` subagent synchronously
- **AND** the AI waits for the subagent to return before responding to the user

#### Scenario: Post-op completes before user response

- **WHEN** any write-type skill (capture, inbox, action, task, project, area, connect) finishes in Gemini CLI
- **THEN** changelog, MOC, Home.md, and/or Dashboard.md are updated before the user sees the response

### Requirement: Claude Code functionality unaffected

All changes to `.claude/` files SHALL preserve existing Claude Code behavior. No functional regression is allowed.

#### Scenario: Claude Code session works after changes

- **WHEN** a user launches `claude` in the TwinMind project root after this change
- **THEN** all existing skills, hooks, and intent routing work identically to before

### Requirement: End-to-end Gemini CLI verification

The implementation SHALL be verified using the locally installed Gemini CLI (v0.36.0+) with authenticated credentials.

#### Scenario: Full capture flow in Gemini CLI

- **WHEN** a user launches `gemini` and says "Rust 的所有權機制是..."
- **THEN** the system creates a card in `Cards/`, updates `vault-index.json`, runs post-op (changelog + Home.md), and responds with the card summary
