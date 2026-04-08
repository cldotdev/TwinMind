## ADDED Requirements

### Requirement: Router skill file location and frontmatter

The plugin SHALL provide a skill at `skills/router/SKILL.md` with frontmatter fields `name: router` and a `description` that includes trigger phrases for intent classification of knowledge-base inputs.

#### Scenario: Skill file exists with valid frontmatter

- **WHEN** reading `skills/router/SKILL.md`
- **THEN** the file exists with YAML frontmatter containing `name: router`
- **AND** the `description` field mentions intent classification and knowledge-base input routing

### Requirement: Router skill contains full intent classification rules

The `twinmind:router` skill SHALL contain the complete signal words and patterns for all 9 intent categories (CAPTURE, INBOX, ACTION, TASK, PROJECT, AREA, QUERY, REVIEW, CONNECT), sub-intent resolution tables, classification priority order, compound intent handling rules, and fuzzy intent fallback logic.

#### Scenario: All 9 intent signal sections present

- **WHEN** reading `skills/router/SKILL.md`
- **THEN** the body contains signal definitions for CAPTURE, INBOX, ACTION, TASK, PROJECT, AREA, QUERY, REVIEW, and CONNECT
- **AND** each intent section lists its trigger conditions

#### Scenario: Sub-intent resolution present

- **WHEN** reading `skills/router/SKILL.md`
- **THEN** the body contains a sub-intent resolution section listing specific operations for each intent category

#### Scenario: Classification priority present

- **WHEN** reading `skills/router/SKILL.md`
- **THEN** the body contains an ordered priority list for disambiguating inputs that match multiple intents

#### Scenario: Compound intent handling present

- **WHEN** reading `skills/router/SKILL.md`
- **THEN** the body contains rules for splitting and ordering execution when a single input contains multiple intents

#### Scenario: Fuzzy fallback present

- **WHEN** reading `skills/router/SKILL.md`
- **THEN** the body contains fallback rules for ambiguous inputs that cannot be confidently classified

### Requirement: Router skill declares session-level caching

The `twinmind:router` skill preamble and the `router-prompt.md` directive SHALL both state that the skill only needs to be invoked once per session. After the first load, the AI does not need to re-invoke it for subsequent knowledge-base inputs in the same session.

#### Scenario: Caching hint in skill preamble

- **WHEN** reading the preamble of `skills/router/SKILL.md`
- **THEN** it states that re-invocation within the same session is not required

#### Scenario: Caching hint in skeleton directive

- **WHEN** reading the router skill directive in `router-prompt.md`
- **THEN** it states that after first load, re-invocation within the same session is not required

### Requirement: Router skill does not duplicate skeleton content

The `twinmind:router` skill SHALL NOT contain session startup steps, the skill dispatch table, post-op rules, subagent delegation protocol, or hook auto-validation rules. These remain in `router-prompt.md`.

#### Scenario: No session startup in skill

- **WHEN** reading `skills/router/SKILL.md`
- **THEN** the body does not contain session startup steps (Step 1 through Step 5)
- **AND** the body does not contain the skill dispatch table
- **AND** the body does not contain post-op rules or subagent delegation protocol
