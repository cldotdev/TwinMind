## 1. Update Gemini hook timeouts

- [x] 1.1 Change all `timeout: 30` values in `.gemini/settings.json` to `timeout: 30000`

## 2. Verification

- [x] 2.1 Confirm `.claude/settings.json` timeout values remain unchanged at `30`
- [x] 2.2 Confirm `.gemini/settings.json` contains exactly 5 hook entries all with `timeout: 30000`
