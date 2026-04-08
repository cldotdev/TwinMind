## Context

Skill tool 載入 SKILL.md 時只讀本體，不自動載入 `references/` 下的檔案。capture 和 connect 的 wikilink 格式規範放在 `references/link-inference.md`，AI 沒讀到就用直覺寫出 `[[title]]`（錯誤），而非 `[[slug|title]]`（正確）。enrich/SKILL.md 已有 inline 格式，不受影響。

## Goals / Non-Goals

**Goals:**

- 確保 AI 在 capture 和 connect 流程中能看到 wikilink 格式規範
- 與 enrich/SKILL.md 的 inline 格式保持一致

**Non-Goals:**

- 搬移 `link-inference.md` 到共用目錄（skill-creator 慣例為 skill 自包含）
- 將 `link-inference.md` 的完整內容 inline（分類規則等 AI 有動機主動讀取，不需 inline）

## Decisions

**只 inline 格式範例，不 inline 完整規則**

AI 出錯的是「隨手就寫」的格式，不是「要思考才決定」的分類規則。格式只需一行範例即可解決，完整 inline 會打破 DRY 且增加 SKILL.md 體量。

**inline 位置選擇**

- `capture/SKILL.md`：加在 Step 5.5「處理結果 > 有建議且採納」段落，緊鄰「依 link-inference.md 執行」的引用之後
- `connect/SKILL.md`：加在連結建立程序段落（line 38 附近），緊鄰「建立連結程序」的引用之後

## Risks / Trade-offs

- 格式範例存在四處（capture、connect、enrich 的 SKILL.md inline + link-inference.md），修改格式時需同步更新。風險低：wikilink 格式是穩定規範，不常變動。
