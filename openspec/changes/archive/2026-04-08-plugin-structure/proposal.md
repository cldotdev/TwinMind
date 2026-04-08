## Why

TwinMind currently lives as a project-level Claude Code setup: skills, hooks, scripts, and a large CLAUDE.md are all embedded in the same repository as the user's vault data. This means every new user must clone the entire repo, and the system logic cannot be versioned or distributed independently. Converting to a Claude Code plugin decouples the engine from user data, enables `claude plugin install` distribution, and allows users to create vaults anywhere without forking.

## What Changes

- **BREAKING**: Repository restructured from project-level `.claude/` layout to plugin root layout (`.claude-plugin/`, `skills/`, `hooks/`, `scripts/`)
- **BREAKING**: `vault/System/config.md` removed; all configuration consolidated into a single `TwinMind.md` file at the user's project root (YAML frontmatter)
- **BREAKING**: Skill names change from `tm-capture`, `tm-query`, etc. to `twinmind:capture`, `twinmind:query`, etc. (plugin namespace)
- Intent routing logic moves from `CLAUDE.md` to `router-prompt.md`, injected via SessionStart hook
- All hooks and scripts rewritten for cross-platform Node.js (Windows support)
- Existing vault data (`vault/`) becomes a scaffold template in `templates/`
- New `/twinmind:setup` skill for initializing fresh vaults
- OpenSpec-installed files (`.claude/skills/openspec-*`, `.claude/commands/opsx/`) excluded via `.gitignore`
- `commands/` directory not included in Phase 1 (plugin skills bug anthropics/claude-code#41842); intent routing via Skill tool is unaffected

## Capabilities

### New Capabilities

- `plugin-manifest`: Plugin identity, metadata, and directory layout (`.claude-plugin/plugin.json`, top-level structure)
- `session-start-hook`: Cross-platform Node.js SessionStart hook that detects `TwinMind.md` and injects intent routing context
- `config-resolution`: Unified configuration resolution from `TwinMind.md` frontmatter, replacing `vault/System/config.md` and the bootstrap concept
- `vault-setup`: Interactive `/twinmind:setup` skill that scaffolds a new vault with `TwinMind.md` + directory structure from templates
- `skill-migration`: Migration of all 11 tm-* skills to plugin layout with updated paths and namespace

### Modified Capabilities

(none — no existing OpenSpec specs have requirement-level changes)

## Impact

- **All skill files** (11 SKILL.md): path references change from `node scripts/` to `node ${CLAUDE_PLUGIN_ROOT}/scripts/`
- **All hook files** (5 validate-*.js): path resolution changes from `$CLAUDE_PROJECT_DIR/.claude/hooks/` to `${CLAUDE_PLUGIN_ROOT}/hooks/`
- **All scripts** (post-op.mjs, update-index.mjs, fetch-title.mjs, lib/*): vault path resolution changes from `__dirname`-relative to `TwinMind.md` frontmatter-based via `resolve-config.mjs`
- **CLAUDE.md**: removed from repo; content split into `router-prompt.md` (SessionStart injection) and skill-internal documentation
- **README.md**: rewritten for plugin installation flow instead of git clone workflow
- **`.gitignore`**: updated to exclude OpenSpec-installed files
- **No runtime dependencies added** — all scripts use Node.js built-ins only
