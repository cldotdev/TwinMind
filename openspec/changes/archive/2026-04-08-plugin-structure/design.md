## Context

TwinMind is an AI-driven personal knowledge management system built on Claude Code's skills, hooks, and scripts. Currently it is distributed as a single git repository where system logic (`.claude/`, `scripts/`, `CLAUDE.md`) and user data (`vault/`) coexist. Users must clone the repo and work inside it.

Claude Code now supports a plugin system where skills, hooks, and scripts can be packaged independently and installed via `claude plugin install`. This change restructures the repository to conform to the plugin layout, enabling clean separation of engine and data.

**Current state:**

- 11 skills in `.claude/skills/tm-*/SKILL.md`
- 5 validation hooks in `.claude/hooks/validate-*.js`
- Hook config in `.claude/settings.json` using `$CLAUDE_PROJECT_DIR`
- 6 scripts in `scripts/` resolving vault via `__dirname`-relative paths
- 18KB `CLAUDE.md` containing session startup + intent routing + subagent protocol
- Config in `vault/System/config.md` (Markdown with YAML frontmatter)

## Goals / Non-Goals

**Goals:**

- Restructure repo to valid Claude Code plugin layout
- Enable `claude plugin install github:VolderLu/TwinMind` distribution
- Support Windows, macOS, and Linux (cross-platform Node.js only)
- Allow users to create vaults in any directory with customizable vault directory name
- Consolidate configuration into a single `TwinMind.md` at project root
- Preserve all existing skill logic, validation hooks, and script behavior

**Non-Goals:**

- Optimizing the 18KB router prompt for the 10K stdout limit (Phase 2)
- Adding `commands/` directory for slash commands (blocked by anthropics/claude-code#41842)
- Supporting `agents/` directory or custom agent definitions
- Backward compatibility migration from old project-level installs
- Publishing to Claude Code marketplace (future goal, not this change)
- Changing vault-index.json format or any skill business logic

## Decisions

### D1: Single `TwinMind.md` as project marker and config

**Decision**: Use `<project-root>/TwinMind.md` with YAML frontmatter as the sole configuration file. It replaces both the bootstrap marker (`twinmind.json` concept) and the detailed config (`vault/System/config.md`).

**Rationale**: One file serves three purposes — project detection (SessionStart hook checks for its existence), configuration (frontmatter), and documentation (body). Users can edit it in Obsidian if their vault root includes the project root. JSON alternatives (`twinmind.json`) are less user-friendly and require a second config file for Obsidian-editable settings.

**Alternatives considered:**

- `twinmind.json` + `vault/System/config.md`: two files, chicken-and-egg problem for vault path
- `vault/System/config.md` only: hook cannot find vault path without knowing vault directory name first
- `.twinmind.yaml`: hidden file, less discoverable

### D2: All hooks and scripts in Node.js

**Decision**: No shell scripts anywhere in the plugin. All hooks (including `session-start.mjs`) and scripts use Node.js with built-in modules only.

**Rationale**: Claude Code on Windows uses Git Bash for shell execution, which has known issues (hangs, console flash). Node.js is always available since Claude Code itself is a Node.js app. Using `path.join()`, `process.stdin`, and `fs` built-ins ensures cross-platform correctness without external dependencies.

**Alternatives considered:**

- Shell scripts with `node` fallback on Windows: fragile, two code paths to maintain
- Platform-conditional hooks in `hooks.json`: not supported by the plugin spec

### D3: Plugin skill directories without `tm-` prefix

**Decision**: Skill directories named `skills/capture/`, `skills/query/`, etc. Plugin namespace automatically produces `twinmind:capture`, `twinmind:query`.

**Rationale**: The `tm-` prefix was needed in the project-level layout to avoid name collisions. Plugin namespacing handles this automatically. Removing the prefix avoids redundancy (`twinmind:tm-capture` would be awkward).

**Alternatives considered:**

- `skills/twinmind-capture/`: self-describing but creates `twinmind:twinmind-capture` when plugin namespace is applied — redundant after bug #41842 is fixed

### D4: SessionStart hook injects router-prompt.md

**Decision**: The `session-start.mjs` hook reads `TwinMind.md` from `cwd`, and if found, outputs the contents of `router-prompt.md` (intent routing logic) to stdout. Claude Code injects this stdout as session context.

**Rationale**: This replaces the `CLAUDE.md` mechanism. The router prompt is maintained as a standalone file in the plugin, not embedded in user projects. Updates propagate automatically when the plugin is updated.

**Stdout limit**: 10,000 characters. Current CLAUDE.md is ~18KB. Phase 1 outputs the full content and relies on Claude Code's fallback (saves to file, substitutes file reference). Optimization deferred to Phase 2.

### D5: Vault path resolution via resolve-config.mjs

**Decision**: A shared module `scripts/lib/resolve-config.mjs` exports three things: `parseYamlFrontmatter(content)` for general-purpose frontmatter parsing, `resolveConfig(cwd)` for reading TwinMind.md configuration (cached per process), and `resolveVaultRoot(cwd)` for vault path resolution. All scripts import from this module instead of using `__dirname`-relative paths. A companion `scripts/lib/project-meta.mjs` exports `readProjectMeta()` used by both `home.mjs` and `dashboard.mjs`.

**Rationale**: Scripts are installed in `~/.claude/plugins/twinmind/scripts/` but the vault is in the user's project directory. `__dirname`-relative resolution no longer works. `process.cwd()` combined with the `vault_dir` frontmatter value provides the correct path. Extracting `parseYamlFrontmatter` as a shared export eliminates three duplicate copies (home.mjs, dashboard.mjs, and resolve-config.mjs internally). Module-level caching in `resolveConfig()` prevents re-reading and re-parsing TwinMind.md multiple times within a single post-op run.

**YAML parsing**: Simple regex extraction of `key: value` pairs from frontmatter. No external YAML parser needed — the frontmatter schema is flat (no nested objects, no multi-line values). Supports arrays (`[a, b, c]`), numbers, null, and quoted strings.

### D6: Templates for vault scaffolding

**Decision**: The `templates/` directory contains a `TwinMind.md` template and a `vault/` skeleton (empty directories + initial `vault-index.json`). The `/twinmind:setup` skill copies these to the user's project.

**Rationale**: Current `vault/` directory with sample data becomes the template. New users get a clean starting point without example cards.

## Risks / Trade-offs

- **[10K stdout limit]** Router prompt exceeds limit; file reference fallback may degrade intent routing quality. → Mitigation: test fallback behavior; optimize prompt in Phase 2 if needed.
- **[Plugin namespace uncertainty]** Plugin skill naming (`twinmind:capture`) behavior is not fully documented and may have edge cases. → Mitigation: router-prompt.md references skills by both `twinmind:capture` and `capture` forms.
- **[No slash commands]** Users cannot type `/twinmind:capture` due to bug #41842. → Mitigation: 99% of usage is via intent routing (natural language), not slash commands. Acceptable for Phase 1.
- **[Frontmatter parsing fragility]** Simple regex parsing of YAML may fail on edge cases (quoted values, comments, arrays). → Mitigation: keep frontmatter schema flat and simple; document supported format.
- **[Obsidian visibility]** If user's Obsidian vault root is `vault/` subdirectory, `TwinMind.md` at project root is not visible in Obsidian. → Mitigation: document recommendation to set Obsidian vault root at project root.
- **[Breaking change]** Existing users who cloned the old repo must set up fresh. → Mitigation: README documents the new flow; no automated migration needed per user decision.

## Migration Plan

1. Restructure repo in-place: move files to plugin layout
2. Delete old `.claude/` directory, old `CLAUDE.md`, old `vault/System/config.md`
3. Move `vault/` contents to `templates/vault/` (strip user-specific data, keep skeleton)
4. Create all new files (plugin.json, hooks.json, session-start.mjs, resolve-config.mjs, setup skill, router-prompt.md, TwinMind.md template)
5. Update all path references in skills and scripts
6. Update `.gitignore` for OpenSpec files
7. Rewrite README for plugin installation
8. Test: `claude --plugin-dir .` in a fresh directory with `/twinmind:setup`

**Rollback**: Git history preserves the old structure. No external state changes.
