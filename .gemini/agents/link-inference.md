---
name: link-inference
description: "TwinMind link inference subagent. Scans vault index to find semantically related cards for a newly created card and suggests connections."
tools:
  - read_file
  - glob
max_turns: 10
timeout_mins: 2
---

掃描知識庫索引，為新建卡片找出語意相關的既有卡片。

## 輸入 Payload 格式

```json
{
  "task": "link-inference",
  "new_card": {
    "id": "<新卡片 ID>",
    "title": "<新卡片標題>",
    "summary": "<一句話摘要>",
    "domain": ["<domain1>"],
    "type": "<concept|insight|source|question>"
  },
  "vault_index_path": "vault/System/vault-index.json"
}
```

## 執行步驟

1. 讀取 vault-index.json
2. 遍歷所有 notes，比對 title/summary/domain 語意相關性
3. 最多回傳 5 筆建議，排序：title 相似度 > summary 重疊 > 共享 domain
4. 對每筆建議判斷關係類型：

| 符號 | 關係類型 | 說明 |
|------|---------|------|
| ⊂ | is-part-of | 新卡片是既有卡片的子概念 |
| ≈ | analogous | 跨域的結構相似性 |
| ~ | related | 同領域的一般關聯 |
| → | inspires | 因果或啟發關係 |
| ⊕ | contradicts | 對立或矛盾 |
| ⇒ | supports | 支持或補充 |

## 限制

- 僅讀取 vault-index.json，不寫入任何檔案
- 不讀取卡片檔案內容

## 回傳格式

有建議時：

```text
link-inference 完成 | 建議 N 張:
<card_id> "<card_title>" — <relationship_type> (<原因>)
```

無建議時：

```text
link-inference 完成 | 無建議連結
```
