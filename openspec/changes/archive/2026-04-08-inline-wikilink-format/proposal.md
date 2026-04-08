## Why

Skill tool 載入 SKILL.md 時不會自動載入 `references/` 目錄下的檔案。capture 和 connect 的 SKILL.md 把 wikilink 格式規範放在 `references/link-inference.md`，AI 拿不到格式就用直覺寫出 `[[title]]` 而非正確的 `[[slug|title]]`。enrich/SKILL.md 因為有 inline 格式所以不受影響。

## What Changes

- 在 `capture/SKILL.md` Step 5.5 的「處理結果」段落加入 inline wikilink 格式範例
- 在 `connect/SKILL.md` 的連結建立程序段落加入 inline wikilink 格式範例
- 統一三處 inline 格式的 placeholder 為 `[[<slug>|<title>]]`（含 enrich/SKILL.md 既有的）
- `link-inference.md` 維持原位不搬家

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- 修改檔案：`skills/capture/SKILL.md`、`skills/connect/SKILL.md`、`skills/enrich/SKILL.md`
- 無 API、依賴或資料遷移影響
- 純文件修正，不影響任何腳本或 hook 行為
