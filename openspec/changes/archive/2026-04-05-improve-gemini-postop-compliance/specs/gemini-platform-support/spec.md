## MODIFIED Requirements

### Requirement: Gemini subagent definitions

The system SHALL provide `.gemini/agents/post-op.md` and `.gemini/agents/link-inference.md` as formal subagent definitions with YAML frontmatter specifying tools, max_turns, and timeout_mins. The `model` field SHALL be omitted to inherit the session model.

#### Scenario: Post-op agent definition

- **WHEN** reading `.gemini/agents/post-op.md`
- **THEN** it contains YAML frontmatter with name, description, tools list (read_file, write_file, replace, glob), max_turns, and timeout_mins
- **AND** the frontmatter does NOT contain a `model` field
- **AND** the body contains the post-op pipeline instructions adapted from `tm-post-op` SKILL.md

#### Scenario: Link-inference agent definition

- **WHEN** reading `.gemini/agents/link-inference.md`
- **THEN** it contains YAML frontmatter with name, description, tools list (read_file, glob), max_turns, and timeout_mins
- **AND** the body contains link inference instructions adapted from `tm-capture` SKILL.md's link-inference section

#### Scenario: Agents discoverable by Gemini CLI

- **WHEN** a user runs `/agents list` in Gemini CLI
- **THEN** both `post-op` and `link-inference` agents appear in the list

#### Scenario: Post-op agent inherits session model

- **WHEN** the post-op subagent is invoked during a session using `gemini-3.1-pro-preview`
- **THEN** the subagent runs with `gemini-3.1-pro-preview` (inherited from session)
