# 索引完整重建程序

由 `twinmind:review` skill 的索引重建功能引用。

## Step 1 — 確認

若既有 `vault-index.json` 包含資料，先顯示目前卡片數與即將掃描的檔案數，要求使用者確認後才覆寫。

## Step 2 — 掃描檔案系統

1. 列出 `vault/Cards/` 和 `vault/Sources/` 中所有 `.md` 檔案
2. 逐一讀取 YAML frontmatter：`id`、`title`、`type`、`status`、`domain`、`confidence`、`source`、`related_projects`
3. 從 body 內容生成一句話 `summary`

## Step 3 — 重建連結

1. 掃描每個檔案 body 中的 `[[wiki-link]]` 模式
2. 解析 wiki-link 目標為對應卡片 ID，建立 `links_to` 陣列
3. 全部處理完後，從所有 `links_to` 反向計算每筆 `linked_from`
4. 計算每筆 `link_count`（`links_to.length + linked_from.length`）

## Step 4 — 組裝索引

1. 建立 `notes`（key 為 `id`）
2. 計算 `stats`：
   - `total_cards`：notes key 數量
   - `total_links`：所有 `links_to` 長度總和
   - `domains`：統計各 domain 出現次數
   - `last_updated`：當前 ISO 8601
3. 保留既有 `projects` 和 `areas`（若存在）；不存在則初始化空物件
4. `version` 設為 `1`

## Step 5 — 驗證（Post-rebuild validation）

在寫入前，對組裝完成的 JSON 物件執行九項一致性不變式檢查：

1. `stats.total_cards` 等於 `notes` 的 key 數量
2. `stats.total_links` 等於所有 `links_to` 陣列長度總和
3. 每個 domain `d`，`stats.domains[d]` 等於 `domain` 陣列包含 `d` 的 notes 數量
4. 所有 `links_to` 引用都有對應的 `linked_from` 條目（雙向一致）
5. 每個 note 的 `link_count` 等於其 `links_to.length + linked_from.length`
6. `stats.version` 存在
7. Inbox count 匹配 pending inbox items
8. Actions count 匹配 active standalone actions
9. Standalone tasks count 匹配 active standalone tasks

**若所有不變式通過**：rebuild 摘要報告 "all invariants passed"。

**若發現不一致**：在記憶體中修正後再寫入。rebuild 摘要中列出被修正的項目，格式：`corrected: <field> (<old> → <new>)`。

## Step 6 — 寫入

1. 寫入 `vault/System/vault-index.json`
2. 追加 `INDEX_REBUILT` changelog（記錄卡片總數及驗證結果）
