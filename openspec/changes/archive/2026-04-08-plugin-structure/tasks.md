## 1. Plugin Scaffold

- [x] 1.1 Create `.claude-plugin/plugin.json` with name `twinmind`, description, and version `0.1.0`
- [x] 1.2 Create `router-prompt.md` by extracting intent routing logic from `CLAUDE.md` (session startup, intent classification, signal words, dispatch table, subagent protocol, hook validation rules)
- [x] 1.3 Create `templates/TwinMind.md` with YAML frontmatter (all config keys with defaults) and body documentation
- [x] 1.4 Create `templates/vault/` scaffold: `System/vault-index.json`, `System/INDEX_SCHEMA.md`, `Cards/`, `Sources/`, `Atlas/`, `PARA/Inbox/`, `PARA/Actions/`, `PARA/Projects/_index.md`, `PARA/Areas/_index.md`, `PARA/Tasks/tasks.md`, `PARA/Archive/`, `Home.md`, `PARA/Dashboard.md`

## 2. Config Resolution

- [x] 2.1 Create `scripts/lib/resolve-config.mjs` with `resolveConfig(cwd)` and `resolveVaultRoot(cwd)` — parse `TwinMind.md` YAML frontmatter, support flat key-value and simple arrays, default `vault_dir` to `"vault"`
- [x] 2.2 Update `scripts/post-op.mjs` to import `resolveVaultRoot` instead of `resolve(__dirname, '..', 'vault')`
- [x] 2.3 Update `scripts/update-index.mjs` to import `resolveVaultRoot` instead of `resolve(__dirname, '..', 'vault', 'System', 'vault-index.json')`
- [x] 2.4 Update `scripts/fetch-title.mjs` if it references vault paths
- [x] 2.5 Update `scripts/lib/changelog.mjs`, `dashboard.mjs`, `home.mjs`, `moc.mjs` to accept vault root as parameter instead of computing it from `__dirname`

## 3. Hooks Migration

- [x] 3.1 Create `hooks/hooks.json` with `SessionStart` (session-start.mjs) and `PostToolUse` (5 validate-*.js) definitions using `${CLAUDE_PLUGIN_ROOT}` paths
- [x] 3.2 Create `hooks/session-start.mjs` — cross-platform Node.js: read stdin via `process.stdin` async iteration, parse JSON for `cwd`, check `TwinMind.md` existence, output `router-prompt.md` contents to stdout
- [x] 3.3 Move `validate-card.js`, `validate-inbox.js`, `validate-action.js`, `validate-project-files.js`, `validate-index.js` from `.claude/hooks/` to `hooks/`
- [x] 3.4 Update validation hooks to remove any `$CLAUDE_PROJECT_DIR` references if present (verify they use hook input `file_path` for path resolution)

## 4. Skill Migration

- [x] 4.1 Move `.claude/skills/tm-capture/` to `skills/capture/` — update SKILL.md frontmatter `name`, update all `node scripts/` to `node ${CLAUDE_PLUGIN_ROOT}/scripts/`, update cross-references from `tm:` to `twinmind:`
- [x] 4.2 Move `.claude/skills/tm-query/` to `skills/query/` with same updates
- [x] 4.3 Move `.claude/skills/tm-action/` to `skills/action/` with same updates
- [x] 4.4 Move `.claude/skills/tm-task/` to `skills/task/` with same updates
- [x] 4.5 Move `.claude/skills/tm-project/` to `skills/project/` with same updates
- [x] 4.6 Move `.claude/skills/tm-area/` to `skills/area/` with same updates
- [x] 4.7 Move `.claude/skills/tm-inbox/` to `skills/inbox/` with same updates
- [x] 4.8 Move `.claude/skills/tm-connect/` to `skills/connect/` with same updates
- [x] 4.9 Move `.claude/skills/tm-review/` to `skills/review/` with same updates
- [x] 4.10 Move `.claude/skills/tm-enrich/` to `skills/enrich/` with same updates
- [x] 4.11 Move `.claude/skills/tm-post-op/` to `skills/post-op/` with same updates

## 5. Setup Skill

- [x] 5.1 Create `skills/setup/SKILL.md` — check project cleanliness (TwinMind.md, vault dir, old .claude/skills/tm-*), interactive config (vault_dir, locale, domains), copy templates, report completion

## 6. Cleanup and Documentation

- [x] 6.1 Delete `.claude/skills/tm-*/` directories (old skill locations)
- [x] 6.2 Delete `.claude/hooks/` directory (moved to `hooks/`)
- [x] 6.3 Delete `.claude/settings.json` (replaced by `hooks/hooks.json`)
- [x] 6.4 Delete `.claude/commands/tm/` directory (not needed in Phase 1)
- [x] 6.5 Delete `CLAUDE.md` (replaced by `router-prompt.md`)
- [x] 6.6 Delete `vault/System/config.md` (merged into TwinMind.md template)
- [x] 6.7 Move `vault/` contents to `templates/vault/` (strip user-specific data, keep skeleton with initial files)
- [x] 6.8 Update `.gitignore` to exclude `.claude/skills/openspec-*/`, `.claude/commands/opsx/`, and `.claude/` directory
- [x] 6.9 Rewrite `README.md` for plugin installation (`claude plugin install`), setup flow (`/twinmind:setup`), and updated project structure

## 7. Code Quality (post-implementation simplify)

- [x] 7.0a Extract shared `parseYamlFrontmatter` from resolve-config.mjs; remove duplicate copies from home.mjs and dashboard.mjs
- [x] 7.0b Extract shared `readProjectMeta` to `scripts/lib/project-meta.mjs`; remove duplicate copies from home.mjs and dashboard.mjs
- [x] 7.0c Add module-level caching to `resolveConfig()` to avoid re-parsing TwinMind.md per process
- [x] 7.0d Collapse identical create/update branches in moc.mjs
- [x] 7.0e Add stderr error logging in session-start.mjs catch handler
- [x] 7.0f Remove unused `event` parameter from dashboard.mjs `regenerateDashboard`

## 8. Verification

- [x] 8.1 Verify no `node scripts/` (without `${CLAUDE_PLUGIN_ROOT}`) references remain in any skill file
- [x] 8.2 Verify no `$CLAUDE_PROJECT_DIR` references remain in hooks
- [x] 8.3 Verify no `__dirname` vault resolution remains in scripts
- [x] 8.4 Verify no `tm-` or `tm:` references remain in skill files (except historical documentation)
- [x] 8.5 Verify `hooks/hooks.json` is valid JSON with correct structure
- [x] 8.6 Verify `.claude-plugin/plugin.json` is valid JSON
- [x] 8.7 Verify all 12 skill directories exist under `skills/` (capture, query, action, task, project, area, inbox, connect, review, enrich, post-op, setup)
- [x] 8.8 Verify `templates/vault/System/vault-index.json` is valid JSON
