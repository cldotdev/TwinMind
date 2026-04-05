## 1. Cross-platform hooks (modify existing .claude/)

- [x] 1.1 Update `.claude/settings.json` hook commands to use relative paths (`node .claude/hooks/...`)
- [x] 1.2 ~~Add defensive env var fallback~~ — Not needed: hooks receive paths via stdin, not env vars. Gemini copies updated `hookEventName` to `'AfterTool'` instead
- [x] 1.3 Verify Claude Code hooks still work after changes

## 2. Gemini directory structure

- [x] 2.1 Create `.gemini/` directory with hooks/, skills/, agents/ subdirectories
- [x] 2.2 Copy 5 hook JS files from `.claude/hooks/` to `.gemini/hooks/`
- [x] 2.3 Create `.gemini/settings.json` with AfterTool hook configuration using relative paths

## 3. Gemini skills

- [x] 3.1 Copy and adapt `tm-capture` SKILL.md (tool names + foreground subagent)
- [x] 3.2 Copy and adapt `tm-inbox` SKILL.md (tool names + foreground subagent)
- [x] 3.3 Copy and adapt `tm-post-op` SKILL.md (tool names)
- [x] 3.4 Copy and adapt `tm-query` SKILL.md (tool names)
- [x] 3.5 Copy and adapt `tm-connect` SKILL.md (tool names + foreground subagent)
- [x] 3.6 Copy and adapt `tm-action` SKILL.md (tool names + foreground subagent)
- [x] 3.7 Copy and adapt `tm-task` SKILL.md (tool names + foreground subagent)
- [x] 3.8 Copy and adapt `tm-project` SKILL.md (tool names + foreground subagent)
- [x] 3.9 Copy and adapt `tm-area` SKILL.md (tool names + foreground subagent)
- [x] 3.10 Copy and adapt `tm-review` SKILL.md (tool names)
- [x] 3.11 Copy and adapt `tm-enrich` SKILL.md (tool names)
- [x] 3.12 Copy skill reference files (references/ subdirectories) to Gemini skills

## 4. Gemini subagent definitions

- [x] 4.1 Create `.gemini/agents/post-op.md` with YAML frontmatter and post-op instructions
- [x] 4.2 Create `.gemini/agents/link-inference.md` with YAML frontmatter and link inference instructions

## 5. GEMINI.md

- [x] 5.1 Create GEMINI.md from CLAUDE.md with adapted tool names, subagent behavior, and skill dispatch table

## 6. Documentation

- [x] 6.1 Create `docs/agent-development.md` with tool mapping, sync procedures, and platform differences

## 7. Verification

- [x] 7.1 Launch Gemini CLI and verify `.gemini/settings.json` loads correctly
- [x] 7.2 Verify `/skills list` shows all 11 tm-* skills
- [x] 7.3 Verify `/agents list` shows post-op and link-inference agents
- [x] 7.4 Run end-to-end capture flow: create a card, verify hooks trigger, verify post-op runs
- [x] 7.5 Verify Claude Code still works correctly after all changes
