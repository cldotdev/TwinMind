---
name: tm-post-op
description: "TwinMind shared post-operation pipeline — runs as a background subagent after every state change. Handles changelog writing, MOC threshold checks, Home.md regeneration, and Dashboard regeneration. Receives a structured JSON payload from the calling skill containing task, layer, event_type, and event_context. Does NOT write to vault-index.json — only reads it to generate derived files."
license: MIT
metadata:
  author: twinmind
  version: "3.0"
---

本 skill 以 background subagent 的形式執行，不在 main agent context 中運行。Calling skill 透過 Agent tool 啟動本 subagent，傳入結構化 prompt payload。

一致性驗證（frontmatter + 索引不變式）由 PostToolUse hooks 自動處理，本 skill 不重複執行。

## 輸入 Payload

Calling skill 在 subagent prompt 中嵌入以下 JSON：

```json
{
  "task": "post-op",
  "layer": "knowledge | action | both",
  "event_type": "CARD_CREATED",
  "event_context": {
    // 視 event_type 而定的上下文資料
    // 卡片操作：card_id, card_title, card_path, domains
    // 專案操作：project_id, project_title
    // 連結操作：source_id, source_title, target_id, target_title, relation
    // Action/Task/Inbox/Area：對應 id 和 title
  },
  "config": {
    "moc_threshold_create": 5,
    "moc_threshold_split": 20,
    "recent_cards_count": 5,
    "vault_name": "TwinMind"
  },
  "domain_counts": { "technology": 5, "learning": 3 },
  "total_cards": 22,
  "recent_notes": [
    { "title": "...", "path": "...", "created": "2026-04-05", "status": "seed", "type": "concept", "domain": ["technology"] }
  ],
  "changelog_path": "vault/System/changelog-2026-04.md",
  "existing_moc_titles": ["Technology", "Learning"]
}
```

`config`、`domain_counts`、`total_cards`、`recent_notes` 由 calling skill 從 main agent context 中已有的 config.md 和 vault-index.json 資料填充。`changelog_path` 由 main agent 取當前月份計算。`existing_moc_titles` 由 main agent 從 `vault/Atlas/` 掃描取得。Subagent 使用這些欄位取代讀取 `config.md`、`vault-index.json`、`changelog.md` 索引頁，也不 glob `Atlas/`。

## 限制：不寫入 vault-index.json

**Post-op subagent 僅讀取 vault-index.json，絕不寫入。** 所有 vault-index.json 的更新由 main agent 在啟動 subagent 前完成。

若 MOC 操作（新建/刪除/拆分）在其他系統中需要更新 index，subagent 將變更細節包含在 return message 中回報給 main agent。

## Plan Mode 檢查

Subagent 啟動後，首先嘗試一個無害的寫入偵測（如讀取檔案）。若偵測到 plan mode active（Edit/Write tool 被拒絕），立即回傳：

```
post-op 失敗 | step=init | error: plan mode active
```

不嘗試任何寫入操作。Main agent 應在 plan mode 退出後以 inline 方式補執行 post-op。

**正常情況下，main agent 不應在 plan mode 下啟動 post-op subagent**（見 CLAUDE.md Plan Mode 檢查規則）。此檢查是防禦性措施，防止意外情況。

## layer 參數

從 payload 的 `layer` 欄位讀取，決定執行哪些收尾步驟：

| layer | Step 1 Changelog | Step 2 MOC | Step 3 Home.md | Step 4 Dashboard |
|-------|:---:|:---:|:---:|:---:|
| `knowledge` | ✓ | ✓ | ✓ | ✗ |
| `action` | ✓ | ✗ | ✗ | ✓ |
| `both` | ✓ | ✓ | ✓ | ✓ |

**Payload 未含 layer 時預設為 `both`**（安全預設——全部重建，效能略差但不遺漏）。

## Step 1 — 寫入 Changelog

**所有 layer 都執行。**

直接寫入 payload 的 `changelog_path` 指定的檔案（如 `vault/System/changelog-2026-04.md`）。**不自行計算月份，不讀取 `changelog.md` 索引頁來判斷路徑。** 從 payload 的 `event_type` 和 `event_context` 組裝紀錄內容。**不讀取既有內容。**

**月度檔案自動建立：** 若 `changelog_path` 指定的檔案不存在，先以 Write tool 建立檔案，內容為 `# Changelog YYYY-MM` + 空行，再 append 條目。

**Append 方式：** 使用 Bash `echo >>` 或等效的尾部追加方式寫入條目。不使用 Read 或 Edit 讀取既有內容。

**索引頁維護：** 建立新月度檔案時，讀取 `vault/System/changelog.md`（索引頁），檢查是否已有該月連結。若無，在 `# Changelog` heading 後首行插入 `- [[changelog-YYYY-MM|YYYY-MM]]`（newest-first 排序）。若索引頁已有該月連結，不修改索引頁。

條目格式（newest-at-bottom）：

```markdown
## <ISO 8601 timestamp>

**<EVENT_TYPE>**

<一句描述>

- <detail>
- <detail>
```

EVENT_TYPE 從 payload 的 `event_type` 欄位取得：

- **卡片**：`CARD_CREATED`（含路徑/類型/領域）、`CARD_UPDATED`（含變更摘要）、`CARD_DELETED`（含 title/path）
- **連結**：`LINK_CREATED`（含關係符號/說明）、`LINK_REMOVED`（含兩張卡片 title）
- **專案**：`PROJECT_CREATED`/`PAUSED`/`RESUMED`/`COMPLETED`/`ARCHIVED`、`PROJECT_LOG_ADDED`、`CARD_LINKED_TO_PROJECT`/`UNLINKED_FROM_PROJECT`
- **專案內 Action/Task**：`PROJECT_ACTION_ADDED`/`PROJECT_ACTION_COMPLETED`、`PROJECT_TASK_ADDED`/`PROJECT_TASK_COMPLETED`/`PROJECT_TASK_DELETED`
- **獨立 Action**：`ACTION_CREATED`/`ACTION_COMPLETED`/`ACTION_PROMOTED_TO_PROJECT`
- **獨立 Task**：`TASK_CREATED`/`TASK_COMPLETED`/`TASK_DELETED`
- **Inbox**：`INBOX_CREATED`/`INBOX_PROMOTED`/`INBOX_DISMISSED`
- **Area**：`AREA_CREATED`/`AREA_UPDATED`/`AREA_DEACTIVATED`/`AREA_REACTIVATED`
- **MOC**：`MOC_CREATED`/`UPDATED`/`SPLIT`/`DELETED`（見 Step 2）
- **索引**：`INDEX_REBUILT`

## Step 2 — MOC 觸發檢查

**僅 `knowledge` 和 `both` 層執行。**

MOC（Map of Content）是按領域自動組織卡片的索引頁。當某個 domain 的卡片數量達到門檻時自動建立，低於門檻時自動刪除——使用者不需要手動管理。

從 payload 的 `event_context.domains` 取得受影響的 domain 列表。對每個 domain：

1. 從 payload 的 `config.moc_threshold_create`（預設 5）和 `config.moc_threshold_split`（預設 20）取得門檻值。**不讀取 `config.md`。**
2. 從 payload 的 `domain_counts[<domain>]` 取得該 domain 的卡片數。**不讀取 `vault-index.json`。**
3. 從 payload 的 `existing_moc_titles` 判斷該 domain 的 MOC 是否已存在（檢查 domain 名稱是否在陣列中）。**不 glob 或列出 `vault/Atlas/` 目錄。**
4. 判斷動作：

| 條件 | 動作 |
|------|------|
| 卡片數 ≥ threshold 且 domain 不在 `existing_moc_titles` 中 | 建立 MOC |
| 卡片數 ≥ threshold 且 domain 在 `existing_moc_titles` 中 | 更新 MOC（重新生成完整內容） |
| 卡片數 < threshold 且 domain 在 `existing_moc_titles` 中 | 刪除 MOC，追加 `MOC_DELETED` changelog |
| MOC 卡片數 > split threshold | 執行拆分 |
| 已拆分的 parent MOC | 新卡片歸入最匹配的子 MOC |

MOC 的檔案結構、更新矩陣和拆分程序的完整定義，請讀取 `references/moc-structure.md`。

## Step 3 — Home.md 重新生成

**僅 `knowledge` 和 `both` 層執行。**

Home.md 是知識庫的入口頁面，需要即時反映最新狀態。區塊 4（最近新增）從 payload 的 `recent_notes` 生成，**不讀取 vault-index.json**。其餘區塊（1/2/3/5）從 `vault/System/vault-index.json` 讀取資料。按以下 5 個區塊順序**完整重寫** `vault/Home.md`：

**區塊 1 — 進行中專案**

從 `projects` 篩選 `status == "active"`，讀取對應 `goal.md` 的 `deadline`。
格式：`- [[PARA/Projects/<name>/goal|<title>]] — deadline: <日期 or "no deadline"> · <N> cards`
空態：「尚無進行中專案」

**區塊 2 — 關注領域**

從 `areas` 列出所有條目。格式：`- [[PARA/Areas/<name>|<display name>]]`
空態：「尚無關注領域」

**區塊 3 — 知識地圖**

從 payload 的 `existing_moc_titles` 取得頂層 MOC 列表，**不掃描 `vault/Atlas/`**��格式：`[[Atlas/<Domain>|<顯示名>]] (<��片數>)`，卡片數從 payload 的 `domain_counts` 取得。
Parent MOC 顯示子 MOC 加總。Sub-MOC 不單獨列出。
空態：「尚未建立知識地圖（需累積至少 5 張同領域卡片）」

**區塊 4 — 最近新增**

從 payload 的 `recent_notes` 陣列取得（已由 main agent 按 id 降序排好前 N 筆，N = `config.recent_cards_count`）。**不讀取 vault-index.json 或 config.md。**
格式：`- <emoji> [[Cards/<slug>|<title>]] — <YYYY-MM-DD>`
emoji：🌱 seed、🌿 growing、🌳 evergreen。Source 類型用 `Sources/<slug>`。
空態：「尚無卡片」

**區塊 5 — 待發展 (seeds)**

從 `notes` 篩選 `status == "seed"`。格式：`- 🌱 [[Cards/<slug>|<title>]]`（Source 用 `Sources/<slug>`）
空態：「所有卡片都已在成長中！」

## Step 4 — Dashboard 重新生成

**僅 `action` 和 `both` 層執行。**

Dashboard 是行動層的入口頁面。從 `vault/System/vault-index.json` 讀取資料，**完整重寫** `vault/PARA/Dashboard.md`。

### Dashboard 結構

```markdown
# TwinMind Dashboard
> Last updated: <YYYY-MM-DD HH:mm>
```

接下來 5 個區塊：

**區塊 1 — Projects**

標題：`## 📋 Projects (<N> active)`

表格欄位：Project（wikilink）、Progress（進度條）、Actions（done/total）、Tasks（done/total）、Deadline。

- 從 `projects` 篩選 `status == "active"`
- 讀取各 project 的 `goal.md` 取 title 和 deadline
- 進度條：`tasks_done / tasks_total` 比例，10 格 `█`/`░`，加百分比。`tasks_total == 0` → `░░░░░░░░░░ 0%`
- Actions：計算 action 陣列中 done/total
- 排序：有 deadline 的在前（最早優先），無 deadline 的在後，同組按名稱排

**區塊 2 — Actions**

標題：`## ⚡ Actions (<N> independent)`

表格欄位：Action（wikilink）、Tasks（done/total）、Status。

- 從 `standalone_actions` 篩選 `status == "active"`
- wikilink 格式：`[[PARA/Actions/<slug>|<title>]]`

**區塊 3 — Tasks**

標題：`## ☑ Tasks (<N> standalone)`

Checklist 格式：
- Active：`- [ ] <text>`
- Done（30 天內）：`- [x] ~~<text>~~ (<MM-DD>)`

從 `standalone_tasks` 讀取。Active 在前，Done 在後。超過 30 天的 Done 項目省略。

**區塊 4 — Areas**

標題：`## 🔭 Areas (<N> active)`

表格欄位：Area（wikilink）、Projects（count）、Cards（count）。

- 從 `areas` 篩選 `status == "active"`
- wikilink 格式：`[[PARA/Areas/<name>|<display name>]]`

**區塊 5 — Inbox**

標題：`## 📥 Inbox (<N> pending)`

表格欄位：Type（emoji + 類型）、Content（text）、Created（日期）。

- 從 `inbox` 篩選 `status == "pending"`，按 `created` 降序
- emoji：`memo` → `📝 memo`、`idea` → `💡 idea`

## 錯誤處理

Subagent 執行過程中若遇到 hook validation 失敗：

1. **讀取錯誤訊息**，理解具體問題（如 timestamp 格式錯誤、frontmatter 欄位缺失）
2. **修正問題**並重試失敗的寫入操作——僅重試一次
3. **重試成功**：繼續後續步驟
4. **重試仍失敗**：停止執行，回傳失敗訊息

不嘗試修正 vault-index.json 相關的一致性錯誤（因為 subagent 不寫 index）。

## 完成檢查表

所有適用步驟執行完畢後，**必須**依下表逐項確認。若任何標記為「必須」的步驟未執行，**立即補執行**後才能回傳結果。

| Layer | Step 1 Changelog | Step 2 MOC | Step 3 Home.md | Step 4 Dashboard |
|-------|:---:|:---:|:---:|:---:|
| `knowledge` | 必須 | 必須 | 必須 | 跳過 |
| `action` | 必須 | 跳過 | 跳過 | 必須 |
| `both` | 必須 | 必須 | 必須 | 必須 |

**執行規則：**

1. 對照 payload 的 `layer` 值，逐一檢查每個「必須」步驟是否已完成
2. 若發現任何遺漏，立即執行該步驟——不得跳過、不得延後
3. 全部「必須」步驟確認完成後，組裝 return message 回傳

## 回傳訊息

執行完成後回傳單行結果摘要：

**成功範例：**
```
post-op 完成 | layer=knowledge | changelog ✓ | MOC: Technology 更新 ✓ | Home.md ✓
```

**失敗範例：**
```
post-op 失敗 | step=MOC | error: hook validation failed — Atlas/Technology.md frontmatter missing required field
```

回傳訊息不包含 file content，僅狀態摘要。
