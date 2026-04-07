## Why

The `c4942eb` refactor (modularize tm skills and add post-op/update-index scripts) accidentally removed two features from CLAUDE.md and tm-capture SKILL.md: the hash-escape rule that prevents Obsidian from creating garbage tags, and the URL preprocessing step (Step 4.5) that uses `scripts/fetch-title.mjs` to resolve link titles. The script itself still exists but is now orphaned with zero references.

## What Changes

- Restore the "Markdown 注意事項" section in CLAUDE.md with the hash-escape rule for `#` in body text
- Add an inline hash-escape reminder in tm-capture Step 5 (body writing)
- Restore Step 4.5 (URL preprocessing) in tm-capture SKILL.md between Step 4 and Step 5
- Update Step 5 body description to reference the url→title lookup table from Step 4.5

## Capabilities

### New Capabilities

- `hash-escape`: Rule preventing Obsidian from interpreting non-tag `#` (e.g., `C#`, `#42`) as tags in Markdown body text

### Modified Capabilities

- `url-preprocessing`: Restore the Step 4.5 URL preprocessing flow and Step 5 body formatting that were removed in the refactor. Requirements unchanged from existing spec.

## Impact

- `CLAUDE.md`: New section appended at end; garbled text fixed; markdown lint auto-fixed
- `.claude/skills/tm-capture/SKILL.md`: Step 4.5 restored, Step 5 description updated, slug title `~` marker added
- `scripts/fetch-title.mjs`: SSRF protection, charset detection, error guard, O(n²) decode fix
- No dependency changes, no API changes

## Amendments

During audit, five security and quality fixes were applied to `scripts/fetch-title.mjs`:

1. SSRF protection (IP denylist with DNS resolution, including IPv4-mapped IPv6)
2. Error guard for `res.on("error")` after title found
3. Charset detection from Content-Type header with TextDecoder fallback
4. Incremental streaming decode replacing O(n²) Buffer.concat per chunk
5. Slug-inferred titles marked with `~` prefix in SKILL.md
