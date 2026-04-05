## Context

TwinMind 是 AI 驅動的知識管理系統，目前完全依賴 Claude Code runtime（Skills、PostToolUse Hooks、Agent tool）。Gemini CLI v0.36.0 提供了對應的機制（activate_skill、AfterTool hooks、subagent），且刻意保留了 `$CLAUDE_PROJECT_DIR` 相容別名，降低了移植門檻。

現有架構分三層：

1. **平台層**：`.claude/` 目錄（settings、hooks、skills）+ CLAUDE.md
2. **邏輯層**：SKILL.md 裡的操作流程（意圖路由、建卡、連結、post-op）
3. **資料層**：`vault/`（Markdown + JSON，平台無關）

本次變更在平台層新增 `.gemini/` 對應結構，邏輯層透過 tool 名稱替換適配，資料層完全不動。

## Goals / Non-Goals

**Goals:**

- Gemini CLI 使用者能以相同的自然語言體驗操作 TwinMind
- 共用同一個 vault，兩個平台可交替使用
- 現有 Claude Code 功能零影響
- 提供維護指南讓未來 skill 更新時兩邊保持同步

**Non-Goals:**

- 不支援 OpenSpec skills 的 Gemini 版本
- 不設計自動化同步工具（用文件指引 AI Agent 手動同步）
- 不追求 Windows 上的 OpenSpec 相容性
- 不抽象化為 platform-agnostic 中間層（直接 copy + adapt）

## Decisions

### D1: Copy over Symlink

**決定**：`.gemini/` 下的 hooks 和 skills 是 `.claude/` 的完整複製品（經 tool 名稱替換），不使用 symlink。

**替代方案**：Symlink 到共用目錄 → 排除，因為兩個版本的 SKILL.md 內容不同（tool 名稱不同），symlink 無法處理差異。

**理由**：

- SKILL.md 包含平台特定的 tool 名稱（Read vs read_file），必須是不同的檔案
- Hook JS 雖然內容可相同，但為了目錄結構一致性統一用 copy
- 維護成本透過 `docs/agent-development.md` 指引降低

### D2: Hook 呼叫改用相對路徑

**決定**：settings.json 的 hook command 從 `node "$CLAUDE_PROJECT_DIR/.claude/hooks/..."` 改為 `node .claude/hooks/...`（Gemini 版用 `node .gemini/hooks/...`）。

**替代方案**：保留環境變數展開 → 排除，因為 Gemini CLI 在 Windows 上用 PowerShell 執行 hook，`$VAR` 語法不相容。

**理由**：

- 兩個 CLI 都保證 hook 的 CWD 為專案根目錄
- 相對路徑在 bash、Git Bash、PowerShell 上都能正確解析
- 更簡單、更可攜

### D3: Hook JS 不需修改環境變數（實作後修正）

**決定**：Hook 腳本不需要環境變數 fallback。實作時發現 hook 透過 stdin JSON 接收檔案路徑，不使用 `process.env.CLAUDE_PROJECT_DIR`。

**實際變更**：`.gemini/hooks/*.js` 僅將 `hookEventName` 從 `'PostToolUse'` 改為 `'AfterTool'`，並更新檔案頂部註解以反映 Gemini CLI 術語。`.claude/hooks/*.js` 不做任何修改。

### D4: Gemini 版 post-op 改為 foreground 同步執行

**決定**：Claude 版維持 `Agent tool + run_in_background: true`。Gemini 版的 SKILL.md 指示改為同步呼叫 subagent，等待完成後再回應使用者。

**替代方案**：

- AfterTool Hook 觸發 post-op → 排除，因為 post-op 需要 event_context（card_id、domain 等），hook 難以取得完整上下文
- Shell 背景執行 → 排除，因為脫離 AI 上下文，除錯困難

**理由**：

- Gemini CLI subagent 不支援 background 模式
- 同步執行雖慢幾秒，但結果可預測、可除錯
- Subagent 定義在 `.gemini/agents/post-op.md` 和 `link-inference.md`

### D5: GEMINI.md 直譯搬移

**決定**：從 CLAUDE.md 直譯搬移內容至 GEMINI.md，調整 tool 名稱和 subagent 行為描述。不使用 @import 模組化。

**替代方案**：利用 GEMINI.md 的 @import 拆分 → 排除，因為 CLAUDE.md 不支援 @import，兩邊結構不一致會增加同步難度。

**理由**：保持兩個檔案結構一致，方便 diff 比對和同步維護。

### D6: Tool 名稱對應表

固定替換關係，用於 SKILL.md 移植：

| Claude Code | Gemini CLI |
|-------------|------------|
| Read | read_file |
| Write | write_file |
| Edit | replace |
| Grep | grep_search |
| Glob | glob |
| Bash | run_shell_command |
| Skill tool | activate_skill |
| Agent tool (background) | subagent (foreground) |
| Agent tool (foreground) | subagent (foreground) |

### D7: Gemini Subagent 定義

建立兩個 agent 定義檔：

- `.gemini/agents/post-op.md`：post-op pipeline，使用 gemini-2.5-flash 模型（省 token，確定性操作不需最強模型）
- `.gemini/agents/link-inference.md`：連結推薦引擎，使用預設模型（需要語意理解能力）

兩者都限制 tool 存取範圍（read_file、write_file、replace、glob），且設定 max_turns 和 timeout_mins 防止失控。

## Risks / Trade-offs

- **[Skill 內容 drift]** → 兩份 SKILL.md 隨時間可能偏離。Mitigation: `docs/agent-development.md` 明確要求每次 skill 變更時同步更新兩邊。
- **[Gemini CLI 行為差異]** → activate_skill 和 Skill tool 的 prompt injection 方式可能不同，導致 AI 行為偏差。Mitigation: 端到端測試驗證核心流程。
- **[Post-op 同步延遲]** → Gemini 版使用者每次操作多等 5-15 秒。Mitigation: 可接受的代價，Gemini CLI 未來若支援 background subagent 可無痛切回。
- **[Hook 觸發時機差異]** → Gemini 的 AfterTool 與 Claude 的 PostToolUse 在 matcher 語法上不同（正則 vs exact match）。Mitigation: 測試驗證 hook 確實被觸發。
- **[Windows PowerShell 差異]** → Gemini CLI 在 Windows 上用 PowerShell 執行 hook command。Mitigation: 改用相對路徑已解決變數展開問題；Node.js 跨平台。
