## 1. Remove model pin from post-op agent

- [x] 1.1 Remove `model: gemini-2.5-flash` line from `.gemini/agents/post-op.md` YAML frontmatter

## 2. Create Home.md validation hook

- [x] 2.1 Create `.gemini/hooks/validate-home.js` that validates Home.md structural format (5 sections in order, wikilink syntax, emoji prefixes, no non-spec sections)
- [x] 2.2 Register `validate-home.js` in `.gemini/settings.json` under the `write_file|replace` AfterTool matcher

## 3. Inline format templates into post-op agent

- [x] 3.1 Add Home.md and Dashboard.md format specs with concrete examples to `.gemini/agents/post-op.md`
