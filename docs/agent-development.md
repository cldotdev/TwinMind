# Agent Development Guide

TwinMind supports both Claude Code and Gemini CLI. This document describes the dual-platform architecture and how to keep both platforms in sync.

## Directory Structure

```text
TwinMind/
├── CLAUDE.md                 # Claude Code session instructions
├── GEMINI.md                 # Gemini CLI session instructions
├── .claude/
│   ├── settings.json         # PostToolUse hook configuration
│   ├── hooks/                # Validator scripts (JS)
│   └── skills/               # Claude Code skill definitions
│       └── tm-*/SKILL.md
├── .gemini/
│   ├── settings.json         # AfterTool hook configuration
│   ├── hooks/                # Validator scripts (JS, copied from .claude)
│   ├── skills/               # Gemini CLI skill definitions
│   │   └── tm-*/SKILL.md
│   └── agents/               # Gemini subagent definitions
│       └── post-op.md
└── vault/                    # Shared vault (platform-agnostic)
```

## Tool Name Mapping

When porting skills between platforms, replace tool names as follows:

| Claude Code | Gemini CLI | Notes |
|-------------|------------|-------|
| `Read` | `read_file` | File reading |
| `Write` | `write_file` | File creation |
| `Edit` | `replace` | String replacement in files |
| `Grep` | `grep_search` | Content search |
| `Glob` | `glob` | File pattern matching |
| `Bash` | `run_shell_command` | Shell command execution |
| `Skill` tool | `activate_skill` | Skill invocation |
| `Agent` tool | subagent | Subagent delegation |

## Subagent Behavior Difference

This is the most significant behavioral difference between platforms:

| Aspect | Claude Code | Gemini CLI |
|--------|-------------|------------|
| Post-op execution | Background (`run_in_background: true`) | Foreground (synchronous) |
| Link inference | Inline (main agent) | Inline (main agent) |
| User response timing | Immediate (before post-op completes) | After post-op completes |
| Subagent definition | Inline prompt via Agent tool | `.gemini/agents/*.md` files |

### Text Patterns to Watch

When syncing skills that involve post-op, look for these Claude Code patterns:

```markdown
<!-- Claude Code pattern -->
透過 Agent tool（`run_in_background: true`）啟動 subagent
啟動 subagent 後立即回應使用者，不等待 post-op 完成
background subagent
```

Replace with:

```markdown
<!-- Gemini CLI pattern -->
透過 subagent（同步方式）啟動 post-op
等待 subagent 完成後再回應使用者
foreground subagent
```

Link inference is now inline on both platforms (main agent executes directly using vault-index.json data from context). No subagent text patterns to sync for link inference.

## Hook Configuration

Both platforms use the same 5 validator JS scripts. The scripts share identical validation logic. The only difference is `hookEventName` in the JSON output: `.claude/` scripts use `'PostToolUse'`, `.gemini/` scripts use `'AfterTool'`.

**Claude Code** (`.claude/settings.json`):

- Event: `PostToolUse`
- Matcher: `Write|Edit`

**Gemini CLI** (`.gemini/settings.json`):

- Event: `AfterTool`
- Matcher: `write_file|replace`

Hook commands use relative paths (e.g., `node .gemini/hooks/validate-card.js` or `node .claude/hooks/validate-card.js`) for cross-platform compatibility. Both CLIs set the CWD to the project root when executing hooks.

## Session Instructions

`CLAUDE.md` and `GEMINI.md` contain the same intent routing logic with platform-specific adaptations:

| Difference | CLAUDE.md | GEMINI.md |
|-----------|-----------|-----------|
| Skill invocation | `Skill` tool, `tm:capture` | `activate_skill`, `tm-capture` |
| Post-op mode | Background subagent | Foreground subagent |
| Hook event name | PostToolUse | AfterTool |
| Bypass mode | Claude Code mode | Gemini CLI mode |

## Sync Procedure

When updating a skill, follow these steps to keep both platforms aligned:

1. **Make the change in `.claude/skills/tm-*/SKILL.md`** (or vice versa)
2. **Apply tool name replacements** using the mapping table above
3. **Adjust subagent behavior** if the skill involves post-op or link inference
4. **Update the counterpart** in `.gemini/skills/tm-*/SKILL.md`
5. **Copy reference files** if the skill has a `references/` subdirectory
6. **Update session instructions** if the change affects `CLAUDE.md` / `GEMINI.md`
7. **Copy hook scripts** if `.claude/hooks/` was modified — update `hookEventName` to match the target platform (`'PostToolUse'` for Claude, `'AfterTool'` for Gemini)

### Sync Checklist

```text
[ ] SKILL.md content updated on both platforms
[ ] Tool names correct for each platform
[ ] Subagent behavior correct (background vs foreground)
[ ] Reference files copied if changed
[ ] CLAUDE.md / GEMINI.md updated if session-level change
[ ] Hook scripts copied if modified
```

## Skills Excluded from Gemini

The following skills exist only in `.claude/` and are NOT ported to Gemini:

- `openspec-explore` — OpenSpec exploration mode
- `openspec-propose` — OpenSpec change proposal
- `openspec-apply-change` — OpenSpec implementation
- `openspec-archive-change` — OpenSpec archival

These are development workflow tools specific to the Claude Code environment.

## Environment Variables

Both CLIs inject project directory variables:

| Variable | Set By |
|----------|--------|
| `CLAUDE_PROJECT_DIR` | Claude Code (also set by Gemini CLI as compatibility alias) |
| `GEMINI_PROJECT_DIR` | Gemini CLI only |
| `GEMINI_CWD` | Gemini CLI only |

Hook scripts receive file paths via stdin JSON and do not reference environment variables directly. The variables listed above are available in the shell environment if needed by future scripts.
