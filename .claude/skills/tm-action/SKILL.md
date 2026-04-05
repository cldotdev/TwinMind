---
name: tm-action
description: "TwinMind action engine — manages standalone actions that aren't tied to any project. Use this skill when the user describes something they want to do that has a clear scope but doesn't belong to a project. Triggers: '建立行動', 'create action', '新增 action', '完成 action', 'action done', '做完了', '列出 actions', 'list actions', '升格為專案', 'promote to project', or when the user describes an executable goal like '研究 X', '設定 Y', '整理 Z'. Also use when the user says an action is getting too big and needs to become a project. Important: if the user mentions a specific project name, route to tm:project instead — that skill handles project-scoped actions."
license: MIT
metadata:
  author: twinmind
  version: "2.0"
---

獨立行動（Standalone Actions）是介於 Task 和 Project 之間的執行單位——有明確目標和可能的子步驟，但還不需要一個完整專案來管理。例如「研究 Rust async runtime」或「設定家裡 NAS」。

Actions 存在 `vault/PARA/Actions/` 中，每個行動一個 .md 檔案。行動可以包含自己的 task checklist，也可以在 scope 擴大時升格為 Project。

一致性驗證由 PostToolUse hooks 自動處理。狀態變更操作完成後啟動 background subagent 執行 post-op pipeline（`layer: "action"`）。唯讀查詢不需要。

### Post-op Subagent 啟動方式

透過 Agent tool（`run_in_background: true`）啟動 subagent，prompt 包含 post-op payload：
```json
{
  "task": "post-op",
  "layer": "action",
  "event_type": "<ACTION_CREATED|ACTION_COMPLETED|ACTION_PROMOTED_TO_PROJECT>",
  "event_context": { "action_id": "<id>", "action_title": "<title>" },
  "config": {
    "moc_threshold_create": "<從 config.md 取值>",
    "moc_threshold_split": "<從 config.md 取值>",
    "recent_cards_count": "<從 config.md 取值>",
    "vault_name": "<從 config.md 取值>"
  },
  "domain_counts": {
    "<domain>": "<從 vault-index.json stats.domains 取值>"
  },
  "total_cards": "<從 vault-index.json stats.total_cards 取值>",
  "recent_notes": [
    { "title": "...", "path": "...", "created": "YYYY-MM-DD", "status": "...", "type": "...", "domain": ["..."] }
  ]
}
```
`config`、`domain_counts`、`total_cards`、`recent_notes` 從 main agent context 中已有的 config.md 和 vault-index.json 資料填充。

啟動後立即回應使用者。Subagent 依照 `.claude/skills/tm-post-op/SKILL.md` 執行 changelog（append-only 至 `changelog-YYYY-MM.md`）+ Dashboard 重建（使用 payload `config` 和 `domain_counts`，不重新讀取 config.md 或 vault-index.json）。

## 建立獨立 Action

生成 slug（標題轉 kebab-case 英文），檢查檔案衝突。建立 `vault/PARA/Actions/<slug>.md`。

Frontmatter 必填欄位：`id`（YYYYMMDDHHmmss）、`title`、`status`（初始 active）、`created`（YYYY-MM-DD）。選填：`completed`、`source_inbox`（從 Inbox 升格時填入原 ID）、`related_cards`。

Body 包含描述和 `## Tasks` 區塊（checklist 格式）。若使用者提供了子步驟，直接建立為 tasks；若沒有，留空讓之後填入。

更新 `vault-index.json`：`standalone_actions` 新增條目（含 title/status/tasks_total/tasks_done），`stats.total_actions` += 1。啟動 post-op background subagent（event_type: `ACTION_CREATED`，layer: action）。

## 完成獨立 Action

更新 frontmatter：status → done，填入 completed 日期。更新 index：status → done，total_actions -= 1。

**反思鉤（Reflection Hook）**——完成是知識萃取的最佳時機。主動詢問：「做完這個你有什麼收穫或教訓？要建卡嗎？」這是 opt-out 設計（預設問，使用者說「沒有」才跳過），因為人往往不會主動回顧，但被提醒時常能產出有價值的反思。使用者回答 → 調用 `tm:capture` 建卡，source 指向 action 檔案。

啟動 post-op background subagent（event_type: `ACTION_COMPLETED`，layer: action）。

## Action 內的 Task 管理

Action 可以有自己的 task checklist，幫助拆解行動為具體步驟。

- **新增**：在 `## Tasks` 追加 `- [ ] <description>`，index 的 tasks_total += 1
- **完成**：`[ ]` → `[x]`，追加日期，index 的 tasks_done += 1
- **刪除**：移除行，調整 index 的 tasks_total（已完成則也調 tasks_done）

每次變更都更新 `stats.last_updated`。

## 列出獨立 Actions

從 `vault-index.json` 讀取 `standalone_actions`。顯示 title、status、tasks 進度（done/total）。支援按 status 篩選。空態：「目前沒有獨立行動」。唯讀操作，不需 post-op。

## 升格為專案

當行動的 scope 擴大——子任務越來越多、需要多個 action 來完成、需要長期追蹤——就是升格的時機。

流程：調用 `tm:project` 建專案（用 action 標題），將 action 內容移入新專案的 `actions.md` 作為第一個 action，刪除原始 action 檔案，從 index 的 `standalone_actions` 移除。啟動 post-op background subagent（event_type: `ACTION_PROMOTED_TO_PROJECT`，layer: action）。
