## Why

TwinMind 目前深度綁定 Claude Code，限制了使用者基礎。加入 Gemini CLI 支援讓非 Claude 用戶也能使用 TwinMind，同時驗證系統的平台可攜性。Gemini CLI v0.36.0 已具備 skills、hooks、subagent 等對應機制，移植時機成熟。

## What Changes

- 建立 `.gemini/` 目錄結構，包含 settings.json、hooks、skills、agents
- 將 11 個 tm-* SKILL.md 移植為 Gemini CLI 版本（tool 名稱替換，OpenSpec skills 不移植）
- 將 5 個 hook validator 複製至 `.gemini/hooks/`，加入防禦性環境變數 fallback
- 建立 GEMINI.md（從 CLAUDE.md 直譯搬移，調整 tool 名稱與 subagent 行為）
- 建立 `.gemini/agents/` 下的 subagent 定義（post-op、link-inference）
- Gemini 版 post-op 改為 foreground 同步執行（Gemini CLI 不支援 background subagent）
- 建立 `docs/agent-development.md` 說明雙平台同步維護方式
- 現有 `.claude/` hook 呼叫改用相對路徑（移除 shell 變數展開）
- Gemini hook 腳本調整 `hookEventName` 為 `'AfterTool'` 並更新註解

## Capabilities

### New Capabilities

- `gemini-platform-support`: Gemini CLI 平台適配層 — .gemini/ 目錄結構、settings.json、hooks、skills、agents、GEMINI.md
- `cross-platform-hooks`: 跨平台 hook 相容性 — 防禦性環境變數 fallback、相對路徑呼叫
- `platform-sync-guide`: 雙平台同步維護指南 — docs/agent-development.md

### Modified Capabilities

(none)

## Impact

- **新增檔案**：`.gemini/` 目錄下約 25+ 檔案、GEMINI.md、docs/agent-development.md
- **修改檔案**：`.claude/settings.json`（hook command 改相對路徑）、5 個 hook JS（加防禦性 env var fallback）
- **不影響**：vault/ 目錄、現有 Claude Code 功能、OpenSpec 相關 skills
- **依賴**：Gemini CLI v0.36.0+、Node.js 20+
- **測試**：可用本機 Gemini CLI 端到端驗證
