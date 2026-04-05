## ADDED Requirements

### Requirement: Agent development guide document

The system SHALL provide `docs/agent-development.md` that documents the dual-platform architecture, tool name mapping, and synchronization procedures for maintaining `.claude/` and `.gemini/` in parallel.

#### Scenario: Guide contains tool mapping table

- **WHEN** reading `docs/agent-development.md`
- **THEN** it contains a complete tool name mapping table (Read -> read_file, Write -> write_file, Edit -> replace, Grep -> grep_search, Glob -> glob, Bash -> run_shell_command, Skill -> activate_skill, Agent -> subagent)

#### Scenario: Guide contains sync procedure

- **WHEN** an AI Agent needs to update a skill
- **THEN** `docs/agent-development.md` provides step-by-step instructions for updating both `.claude/` and `.gemini/` versions

#### Scenario: Guide documents subagent behavior difference

- **WHEN** reading the sync guide
- **THEN** it explains that Claude uses background subagent (run_in_background: true) while Gemini uses foreground subagent (synchronous)
- **AND** it provides the specific text patterns to look for and replace when syncing post-op related instructions

#### Scenario: Guide documents files excluded from Gemini

- **WHEN** reading the sync guide
- **THEN** it lists which skills are excluded from Gemini (OpenSpec skills: openspec-explore, openspec-propose, openspec-apply-change, openspec-archive-change, and the tm-enrich skill if applicable)
