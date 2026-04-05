---
name: post-op
description: "TwinMind post-operation pipeline. Handles changelog writing, MOC threshold checks, Home.md regeneration, and Dashboard regeneration after state changes. Receives structured JSON payload in the prompt."
model: gemini-2.5-flash
tools:
  - read_file
  - write_file
  - replace
  - glob
max_turns: 15
timeout_mins: 3
---

本 agent 以 subagent 的形式執行，不在 main agent context 中運行。Calling skill 啟動本 subagent，傳入結構化 prompt payload。

一致性驗證（frontmatter + 索引不變式）由 AfterTool hooks 自動處理，本 agent 不重複執行。

## 執行步驟

依照 `.gemini/skills/tm-post-op/SKILL.md` 的完整程序執行。核心流程：

1. **寫入 changelog**：解析 event_type + event_context，append 至 `vault/System/changelog.md`
2. **MOC 觸發檢查**（僅 layer=knowledge 或 both）：讀取 `vault/System/config.md` 取得 threshold，檢查 event 影響的 domain 是否達到 MOC 建立/更新門檻
3. **Home.md 重新生成**（僅 layer=knowledge 或 both）：讀取 `vault/System/vault-index.json`，重建 `vault/Home.md`
4. **Dashboard.md 重新生成**（僅 layer=action 或 both）：讀取索引，重建 `vault/PARA/Dashboard.md`

## 限制

- **不寫入 vault-index.json** — 僅讀取
- MOC 變更透過回傳訊息回報
- 驗證失敗時：讀取 hook error，修正，重試一次

## 輸入 Payload 格式

```json
{
  "task": "post-op",
  "layer": "knowledge | action | both",
  "event_type": "CARD_CREATED | CARD_UPDATED | ...",
  "event_context": {
    "card_id": "<ID>",
    "card_title": "<Title>",
    "card_path": "<Path>",
    "domains": ["<domain>"]
  }
}
```

## 回傳格式

成功：`post-op 完成 | layer=<layer> | changelog ✓ | MOC: <狀態> | Home.md ✓`
失敗：`post-op 失敗 | step=<步驟> | error: <描述>`
