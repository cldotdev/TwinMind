## 1. Create router skill

- [x] 1.1 Create `skills/router/SKILL.md` with frontmatter (`name: router`, `description` with intent classification trigger phrases)
- [x] 1.2 Move signal words & patterns section (all 9 intents) from `router-prompt.md` into the skill body
- [x] 1.3 Move sub-intent resolution section into the skill body
- [x] 1.4 Move classification priority, compound intent handling, and fuzzy fallback sections into the skill body
- [x] 1.5 Verify skill contains no skeleton content (no session startup, no dispatch table, no post-op rules, no subagent protocol)

## 2. Trim router-prompt.md

- [x] 2.1 Remove signal words & patterns section from `router-prompt.md`
- [x] 2.2 Remove sub-intent resolution section from `router-prompt.md`
- [x] 2.3 Remove classification priority, compound intent handling, and fuzzy fallback sections from `router-prompt.md`
- [x] 2.4 Add router skill directive after the intent category table: when classifying intent for a knowledge-base input, invoke `twinmind:router` first
- [x] 2.5 Verify `router-prompt.md` character count is below 10,000 (`wc -m router-prompt.md`) — 7,189 chars

## 3. Verify

- [x] 3.1 Verify `skills/router/SKILL.md` contains all 9 intent signal sections, sub-intent resolution, classification priority, compound intent, and fuzzy fallback
- [x] 3.2 Verify `router-prompt.md` retains session startup (Steps 1-5), intent category table, skill dispatch table, plan mode check, post-op rules, subagent protocol, hook auto-validation, and Markdown caveats
- [x] 3.3 Verify no content is lost: union of skeleton + skill covers all original `router-prompt.md` content
- [x] 3.4 Run `claude --plugin-dir . --print "test session start"` or equivalent to confirm hook output stays under 10K — 7,164 chars confirmed
