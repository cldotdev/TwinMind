## ADDED Requirements

### Requirement: TwinMind.md as single configuration source

All configuration SHALL be stored in `TwinMind.md` at the user's project root using YAML frontmatter. The frontmatter SHALL support the following keys: `vault_dir` (string, default `"vault"`), `locale` (string), `domains` (array of strings), `moc_threshold_create` (number), `moc_threshold_split` (number), `recent_cards_count` (number), `default_card_type` (string), `memo_stale_days` (number), `action_stale_days` (number).

#### Scenario: Minimal configuration

- **WHEN** `TwinMind.md` contains only `vault_dir: notes` in frontmatter
- **THEN** `resolveConfig()` returns `{ vault_dir: "notes" }` with other keys undefined

#### Scenario: Full configuration

- **WHEN** `TwinMind.md` contains all supported frontmatter keys
- **THEN** `resolveConfig()` returns an object with all keys correctly parsed

### Requirement: resolve-config.mjs module

The `scripts/lib/resolve-config.mjs` module SHALL export `parseYamlFrontmatter(content)`, `resolveConfig(cwd)`, and `resolveVaultRoot(cwd)` functions. `parseYamlFrontmatter` SHALL parse YAML frontmatter from any Markdown content string. `resolveConfig` SHALL parse the YAML frontmatter of `TwinMind.md` at the given `cwd` and cache the result per process. `resolveVaultRoot` SHALL return the absolute path to the vault directory by joining `cwd` with the `vault_dir` value.

#### Scenario: Vault root resolution

- **WHEN** `TwinMind.md` contains `vault_dir: my-brain` and `cwd` is `/home/user/project`
- **THEN** `resolveVaultRoot("/home/user/project")` returns `/home/user/project/my-brain`

#### Scenario: Default vault directory

- **WHEN** `TwinMind.md` does not specify `vault_dir`
- **THEN** `resolveVaultRoot()` uses `"vault"` as the default directory name

### Requirement: YAML frontmatter parsing without external dependencies

The frontmatter parser SHALL use regex-based extraction, supporting flat `key: value` pairs and simple arrays (`key: [a, b, c]`). It SHALL NOT require any npm packages.

#### Scenario: Array value parsing

- **WHEN** frontmatter contains `domains: [philosophy, psychology, technology]`
- **THEN** `resolveConfig()` returns `domains` as `["philosophy", "psychology", "technology"]`

#### Scenario: Missing frontmatter

- **WHEN** `TwinMind.md` has no `---` delimiters
- **THEN** `resolveConfig()` throws an error with message containing "frontmatter not found"

### Requirement: All scripts use resolve-config for vault path

All scripts (`post-op.mjs`, `update-index.mjs`, `fetch-title.mjs`) SHALL import `resolveVaultRoot` from `resolve-config.mjs` instead of using `__dirname`-relative path resolution. The `process.cwd()` SHALL be used as the default `cwd` argument.

#### Scenario: Script vault resolution

- **WHEN** `post-op.mjs` runs in a directory containing `TwinMind.md` with `vault_dir: vault`
- **THEN** it resolves the vault path via `resolveVaultRoot(process.cwd())` and operates on the correct directory
