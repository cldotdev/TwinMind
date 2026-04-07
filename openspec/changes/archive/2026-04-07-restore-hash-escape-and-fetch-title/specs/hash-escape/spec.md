## ADDED Requirements

### Requirement: Hash-escape rule in CLAUDE.md

CLAUDE.md SHALL include a "Markdown 注意事項" section that instructs the LLM to escape or backtick-wrap non-tag `#` characters in Markdown body text. JSON files and YAML frontmatter SHALL NOT be affected by this rule.

#### Scenario: Body text contains programming language with hash

- **WHEN** the LLM writes body text containing `C#` or `F#`
- **THEN** the `#` SHALL be escaped as `\#` or the term wrapped in backticks (e.g., `C\#` or `` `C#` ``)

#### Scenario: Body text contains numbered reference

- **WHEN** the LLM writes body text containing `#1`, `#42`, or `#123`
- **THEN** the `#` SHALL be escaped as `\#` or the term wrapped in backticks

#### Scenario: YAML frontmatter contains hash

- **WHEN** a `#` appears inside YAML frontmatter (between `---` delimiters)
- **THEN** the `#` SHALL NOT be escaped

#### Scenario: JSON file contains hash

- **WHEN** a `#` appears inside a JSON file (e.g., vault-index.json)
- **THEN** the `#` SHALL NOT be escaped

### Requirement: Inline hash-escape reminder in tm-capture Step 5

tm-capture SKILL.md Step 5 (body writing) SHALL include an inline reminder that non-tag `#` in body text must be escaped or backtick-wrapped. This provides point-of-action reinforcement of the CLAUDE.md rule.

#### Scenario: LLM writes card body with hash characters

- **WHEN** the LLM composes a card body in Step 5 that contains non-tag `#`
- **THEN** the inline reminder ensures the LLM applies the escape rule without needing to recall the CLAUDE.md section
