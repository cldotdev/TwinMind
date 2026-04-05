## ADDED Requirements

### Requirement: Home.md structural validation hook

The system SHALL provide a `.gemini/hooks/validate-home.js` hook that validates `vault/Home.md` structural format after every `write_file` or `replace` operation targeting that path.

#### Scenario: Non-Home.md writes are skipped

- **WHEN** Gemini CLI writes to any file other than `vault/Home.md`
- **THEN** the hook exits with code 0 and prints a skip message

#### Scenario: Valid Home.md passes validation

- **WHEN** Gemini CLI writes a Home.md containing exactly 5 H2 sections in order ("進行中專案", "關注領域", "知識地圖", "最近新增", "待發展 (seeds)") with wikilink syntax and emoji prefixes in the recent section
- **THEN** the hook exits with code 0

#### Scenario: Missing required sections rejected

- **WHEN** Gemini CLI writes a Home.md that is missing one or more of the 5 required H2 sections
- **THEN** the hook exits with code 2 and prints which sections are missing

#### Scenario: Wrong section order rejected

- **WHEN** Gemini CLI writes a Home.md with all 5 sections present but in wrong order
- **THEN** the hook exits with code 2 and prints the expected vs actual order

#### Scenario: Markdown link syntax rejected

- **WHEN** Gemini CLI writes a Home.md containing `[text](path)` link syntax in content sections (below the H1 header)
- **THEN** the hook exits with code 2 and prints the offending lines

#### Scenario: Missing emoji prefixes in recent section rejected

- **WHEN** Gemini CLI writes a Home.md where the "最近新增" section contains list items without emoji prefixes (🌱, 🌿, or 🌳)
- **THEN** the hook exits with code 2 and prints the offending lines

#### Scenario: Non-spec sections rejected

- **WHEN** Gemini CLI writes a Home.md containing H2 sections not in the allowed set (e.g., "知識庫概覽", "總卡片數")
- **THEN** the hook exits with code 2 and prints the unexpected section names

### Requirement: Home.md validation hook registered in settings

The system SHALL register `validate-home.js` in `.gemini/settings.json` under the `AfterTool` hooks array, using the same `write_file|replace` matcher as existing hooks.

#### Scenario: Hook registered alongside existing hooks

- **WHEN** reading `.gemini/settings.json`
- **THEN** the `AfterTool` array contains a hook entry with `command: "node .gemini/hooks/validate-home.js"` under the `write_file|replace` matcher
