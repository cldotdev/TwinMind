---
name: post-op
description: "TwinMind shared post-operation pipeline — DEPRECATED as LLM subagent. Post-op is now handled programmatically via scripts/post-op.mjs. This skill file is retained for reference only."
license: MIT
metadata:
  author: twinmind
  version: "4.0"
---

## twinmind:post-op（已廢除）

Post-op pipeline 已程式化為 `${CLAUDE_PLUGIN_ROOT}/scripts/post-op.mjs`，不再使用 LLM subagent 執行。

呼叫方式：

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-op.mjs --layer <knowledge|action|both> --event '<JSON>'
```

詳見 `${CLAUDE_PLUGIN_ROOT}/scripts/post-op.mjs` 和 `${CLAUDE_PLUGIN_ROOT}/scripts/lib/` 目錄。
