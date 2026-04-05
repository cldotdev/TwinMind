---
name: post-op
description: "TwinMind post-operation pipeline. Handles changelog writing, MOC threshold checks, Home.md regeneration, and Dashboard regeneration after state changes. Receives structured JSON payload in the prompt."
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

## Home.md 格式（5 區塊，完整重寫 `vault/Home.md`）

從 `vault/System/vault-index.json` 讀取資料，按以下 5 個區塊**嚴格依序**生成。

**區塊 1 — 進行中專案**
從 `projects` 篩選 `status == "active"`，讀取對應 `goal.md` 的 `deadline`。
格式：`- [[PARA/Projects/<name>/goal|<title>]] — deadline: <日期 or "no deadline"> · <N> cards`
空態：「尚無進行中專案」

**區塊 2 — 關注領域**
從 `areas` 列出所有條目。格式：`- [[PARA/Areas/<name>|<display name>]]`
空態：「尚無關注領域」

**區塊 3 — 知識地圖**
掃描 `vault/Atlas/`，列出頂層 MOC。格式：`- [[Atlas/<Domain>|<顯示名>]] (<卡片數>)`
空態：「尚未建立知識地圖（需累積至少 5 張同領域卡片）」

**區塊 4 — 最近新增**
從 `notes` 按 `id` 降序取前 N 筆（N = `config.md` 的 `recent_cards_count`，預設 5）。
格式：`- <emoji> [[Cards/<slug>|<title>]] — <YYYY-MM-DD>`
emoji：🌱 seed、🌿 growing、🌳 evergreen。Source 類型用 `Sources/<slug>`。
空態：「尚無卡片」

**區塊 5 — 待發展 (seeds)**
從 `notes` 篩選 `status == "seed"`。格式：`- 🌱 [[Cards/<slug>|<title>]]`
空態：「所有卡片都已在成長中！」

### Home.md 範例輸出

```markdown
# TwinMind

> AI-driven knowledge management system

## 進行中專案

- [[PARA/Projects/launch-twinmind/goal|發布 TwinMind]] — deadline: 2026-04-10 · 3 cards

## 關注領域

- [[PARA/Areas/career-development|職涯發展]]

## 知識地圖

- [[Atlas/MOC-technology|Technology MOC]] (5)

## 最近新增

- 🌱 [[Cards/rust-ownership|Rust Ownership]] — 2026-04-05
- 🌿 [[Cards/bash-strict-mode|Bash Strict Mode]] — 2026-04-05
- 🌳 [[Cards/zettelkasten|卡片盒筆記法]] — 2026-04-04

## 待發展 (seeds)

- 🌱 [[Cards/rust-ownership|Rust Ownership]]
- 🌱 [[Cards/quantum-encryption|量子加密的未來]]
```

**嚴禁**：不得新增「知識庫概覽」「總卡片數」「總連結數」「領域分佈」等非規範區塊。不得使用 `[text](path)` markdown 連結語法——一律使用 `[[path|title]]` wikilink。

## Dashboard 格式（5 區塊，完整重寫 `vault/PARA/Dashboard.md`）

從 `vault/System/vault-index.json` 讀取資料。

### Dashboard 範例輸出

```markdown
# TwinMind Dashboard

> Last updated: 2026-04-05 14:30

## 📋 Projects (1 active)

| Project | Progress | Actions | Tasks | Deadline |
|---------|----------|---------|-------|----------|
| [[PARA/Projects/launch-twinmind/goal\|發布 TwinMind]] | ████░░░░░░ 40% | 1/2 | 2/5 | 2026-04-10 |

## ⚡ Actions (1 independent)

| Action | Tasks | Status |
|--------|-------|--------|
| [[PARA/Actions/review-ruby-codebase\|Review Ruby Codebase]] | 0/3 | active |

## ☑ Tasks (2 standalone)

- [ ] 繳電費
- [x] ~~買牛奶~~ (04-03)

## 🔭 Areas (1 active)

| Area | Projects | Cards |
|------|----------|-------|
| [[PARA/Areas/career-development\|職涯發展]] | 1 | 3 |

## 📥 Inbox (1 pending)

| Type | Content | Created |
|------|---------|---------|
| 💡 idea | 睡眠與創造力的關聯 | 2026-04-05 |
```

## 回傳格式

成功：`post-op 完成 | layer=<layer> | changelog ✓ | MOC: <狀態> | Home.md ✓`
失敗：`post-op 失敗 | step=<步驟> | error: <描述>`
