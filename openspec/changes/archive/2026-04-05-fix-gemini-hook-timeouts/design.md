## Context

TwinMind uses 5 PostToolUse/AfterTool validation hooks (validate-card, validate-inbox, validate-action, validate-project-files, validate-index) implemented as Node.js scripts. These hooks are configured identically in both `.claude/settings.json` and `.gemini/settings.json` with `timeout: 30`.

The two platforms interpret this value differently:

- Claude Code: seconds (30s) — hooks work fine
- Gemini CLI: milliseconds (30ms) — hooks always timeout

## Goals / Non-Goals

**Goals:**

- Make all 5 Gemini CLI hooks execute successfully with sufficient timeout
- Maintain parity with Claude Code's effective timeout behavior

**Non-Goals:**

- Changing hook script logic or performance optimization
- Fixing Gemini CLI built-in tool registration warnings (not project-controllable)
- Unifying the timeout unit across platforms (each platform has its own convention)

## Decisions

**Timeout value: 30000ms (30 seconds)**

Rationale: Claude Code uses 30 seconds, but that's generous. Node.js cold start (~50ms) + stdin read + JSON parse + file I/O + validation logic realistically completes in under 1 second. 30 seconds provides ample headroom without being wasteful. The existing Claude Code hooks also use 30s, so 30s (30000ms) gives exact parity and is conservative enough.

Alternative considered: 10000ms (10 seconds). Sufficient in practice, but rejected in favor of exact parity with Claude Code's 30s — consistency is preferable when the cost is negligible.

## Risks / Trade-offs

- [Risk] Future hooks might need more time → 30s is generous enough; adjust if needed
- [Risk] Gemini CLI might change timeout semantics → Monitor on Gemini CLI updates
