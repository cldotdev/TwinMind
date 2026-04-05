---
name: tm-capture
description: "TwinMind card engine. Use this whenever the user shares a thought, idea, knowledge, question, or source reference that should be captured as a card. Also handles card updates and deletions. Covers the full lifecycle: type classification, duplicate detection, card creation, automatic link inference to existing cards, and index updates. If the user says something that looks like knowledge worth remembering — this is the skill to use."
license: MIT
metadata:
  author: twinmind
  version: "1.0"
---

捕捉使用者的想法、知識、問題或來源引用，轉化為知識卡片。建卡後自動尋找並建立與既有卡片的連結——這是知識庫產生價值的核心機制，因為孤立的卡片遠不如互相連結的知識網路有用。

一致性驗證由 PostToolUse hooks 自動處理，不需手動檢查。完成操作後啟動 background subagent 執行 post-op pipeline（changelog、MOC、Home 更新）。連結推理由 main agent inline 執行（不使用 subagent）。

## 建立卡片（CARD_CREATED）

### Step 1 — 類型分類

| 類型 | 判斷依據 | 範例 |
|------|----------|------|
| `concept` | 知識點、定義、原理 | 「CAP 定理說分散式系統只能三選二」 |
| `insight` | 跨域觀察、個人體悟、類比 | 「CAP 定理跟創業三難抉擇的邏輯很像」 |
| `source` | 明確引用書/文章/影片/URL | 「我在讀《DDIA》第五章講 replication」 |
| `question` | 開放式問題、待探索主題 | 「量子計算會怎麼影響加密？」 |

無法確定時用 `config.md` 的 `default_card_type`（預設 `concept`）。

### Step 2 — 重複偵測

讀取 `vault-index.json` 的 `notes`，比對 title/summary 是否與既有卡片語意等價（含跨語言，如 "Rust Ownership" vs "Rust 所有權機制"）。

- 偵測到重複 → 回報既有卡片，詢問「合併」或「建立新卡片」
- 無重複 → 繼續

### Step 3 — 生成 ID 與檔名

- **ID**：`YYYYMMDDHHmmss` 格式（當前時間）
- **Slug**：title 轉 kebab-case 英文（如 "Rust 所有權機制" → `rust-ownership`）
- **路徑**：type 為 `source` → `Sources/<slug>.md`，其餘 → `Cards/<slug>.md`
- **衝突**：檔案已存在則加數字後綴（`rust-ownership-2.md`）

### Step 4 — 生成 Frontmatter

```yaml
---
id: "<YYYYMMDDHHmmss>"
title: "<人類可讀標題>"
type: <concept|insight|source|question>
status: seed
domain: [<AI 分類的領域標籤>]
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
confidence: medium
source: "<來源：使用者輸入 / URL / 書名>"
related_projects: []
---
```

10 個必填欄位，全部要有值。新卡片固定 `status: seed`、`confidence: medium`。

### Step 5 — 寫入卡片檔案

```markdown
---
<frontmatter>
---

# <title>

<使用者輸入重整為原子化筆記內容>

## Connections

（尚無連結）
```

### Step 5.5 — 連結推理（Inline 執行）

建卡的核心增值步驟——自動發現新卡片與既有知識的關聯。Main agent 直接使用 session 啟動時已載入 context 的 vault-index.json notes 資料執行語意比對，**不啟動 foreground subagent**。

**執行流程：**

1. 從 context 中已有的 vault-index.json `notes` 資料，遍歷所有既有卡片
2. 比對新卡片的 `title`、`summary`、`domain` 與每張既有卡片的對應欄位
3. 識別語意相關的卡片（最多 5 筆），排序：title 相似度 > summary 重疊 > 共享 domain
4. 對每筆建議判斷關係類型（is-part-of ⊂ / analogous ≈ / related ~ / inspires → / contradicts ⊕ / supports ⇒）
5. 根據使用者原始輸入上下文，決定採納哪些建議

**處理結果：**

- **有建議且採納**：對每筆採納的建議，依 `references/link-inference.md` 的「建立連結程序」執行雙向連結寫入
- **無建議**：Connections 保持 `（尚無連結）`
- **索引資料異常**（如 notes 資料缺失或格式錯誤）：跳過連結推理，Connections 保持 `（尚無連結）`，告知使用者自動連結建議暫時不可用

若 vault 為空（`notes` 為空物件），跳過連結推理，直接保持 `（尚無連結）`。

### Step 6 — 更新索引

原子更新 `vault/System/vault-index.json`：

1. 在 `notes` 新增條目（key 為 timestamp ID）：
   ```json
   {
     "title": "<title>",
     "path": "Cards/<slug>.md",
     "type": "<type>",
     "status": "seed",
     "domain": ["<domain1>"],
     "summary": "<一句話摘要>",
     "links_to": ["<Step 5.5 採納的連結目標 ID，或空>"],
     "linked_from": ["<Step 5.5 反向連結來源 ID，或空>"],
     "link_count": "<Step 5.5 計算或 0>"
   }
   ```
2. `stats.total_cards` += 1
3. 每個 domain：`stats.domains[tag]` += 1（不存在則初始化為 1）
4. `stats.last_updated` = 當前 ISO 8601

### Step 7 — 啟動 post-op（Background Subagent）

**不再調用 `/tm:post-op` Skill tool。** 改為透過 Agent tool 啟動 background subagent 執行 post-op pipeline。

**寫入順序保證：** Step 6（索引更新）必須完成後才能啟動 subagent。

透過 Agent tool（`run_in_background: true`）啟動 subagent，prompt 包含：

```
你是 TwinMind post-op subagent。執行 post-op pipeline 收尾工作。

## 輸入
{
  "task": "post-op",
  "layer": "knowledge",
  "event_type": "<CARD_CREATED | CARD_UPDATED | CARD_DELETED>",
  "event_context": {
    "card_id": "<卡片 ID>",
    "card_title": "<卡片標題>",
    "card_path": "<Cards/slug.md 或 Sources/slug.md>",
    "domains": ["<domain1>", ...]
  },
  "config": {
    "moc_threshold_create": <從 config.md 取值>,
    "moc_threshold_split": <從 config.md 取值>,
    "recent_cards_count": <從 config.md 取值>,
    "vault_name": "<從 config.md 取值>"
  },
  "domain_counts": {
    "<domain>": <從 vault-index.json stats.domains 取值>
  },
  "total_cards": <從 vault-index.json stats.total_cards 取值>,
  "recent_notes": [
    { "title": "...", "path": "...", "created": "YYYY-MM-DD", "status": "...", "type": "...", "domain": ["..."] }
  ]
}

`config`、`domain_counts`、`total_cards` 從 main agent context 中已有的 config.md 和 vault-index.json 資料填充。
`recent_notes` 為 vault-index.json notes 按 id 降序取前 N 筆（N = config.recent_cards_count），每筆含 title/path/created/status/type/domain。

## 執行步驟
依照 .claude/skills/tm-post-op/SKILL.md 的完整程序執行：
1. 寫入 changelog（event_type + event_context）— append-only 至 changelog-YYYY-MM.md
2. MOC 觸發檢查（從 payload 的 config 和 domain_counts 取值，不讀 config.md 和 vault-index.json）
3. Home.md 重新生成（Recent Cards 從 payload 的 recent_notes 生成，其餘區塊讀 vault-index.json）

不寫入 vault-index.json。MOC 變更包含在回傳訊息中。

## 回傳格式
成功：post-op 完成 | layer=knowledge | changelog ✓ | MOC: <狀態> | Home.md ✓
失敗：post-op 失敗 | step=<步驟> | error: <描述>
```

啟動 subagent 後立即回應使用者，不等待 post-op 完成。

## 更新卡片（CARD_UPDATED）

1. 從 `vault-index.json` 查找目標卡片（by title/keyword）
2. 讀取卡片 `.md` 檔案
3. 修改內容或 frontmatter（status, domain, confidence, body 等）
4. `updated` 設為當天日期。`id` 和 `created` 不得修改
5. 寫回檔案
6. 同步 `vault-index.json`：更新對應 notes 條目。若 domain 變更：舊 domain -1（歸零刪 key），新 domain +1。更新 `stats.last_updated`
7. 啟動 post-op background subagent（同 Step 7 格式，event_type 為 `CARD_UPDATED`，event_context 含變更摘要）

## 刪除卡片（CARD_DELETED）

1. 從 `vault-index.json` 查找目標卡片
2. 找不到 → 回報「未找到匹配的卡片」
3. 找到後：
   a. 刪除卡片 `.md` 檔案
   b. 原子更新 `vault-index.json`：
      - 移除 `notes` 條目
      - `stats.total_cards` -= 1
      - 每個 domain：`stats.domains[tag]` -= 1（歸零刪 key）
      - 清理其他 notes 的 `links_to`/`linked_from` 中該卡片 ID
      - 重算受影響 notes 的 `link_count` 和 `stats.total_links`
      - 檢查 `related_projects`，對每個專案：`projects[name].card_refs` -= 1（最小 0）
      - 更新 `stats.last_updated`
   c. 啟動 post-op background subagent（同 Step 7 格式，event_type 為 `CARD_DELETED`，event_context 含被刪卡片 title/path/domains）
