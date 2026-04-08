## Context

The `c4942eb` refactor converted post-op from LLM subagent to Node.js scripts and streamlined all tm skills. During this process, two unrelated features were removed from CLAUDE.md and tm-capture SKILL.md:

1. **Hash-escape rule** — a one-line rule in CLAUDE.md's "Markdown 注意事項" section that instructed the LLM to escape `#` in body text when not used as Obsidian tags
2. **URL preprocessing (Step 4.5)** — the LLM-driven flow in tm-capture that scans user input for URLs, calls `scripts/fetch-title.mjs`, builds a url→title mapping, and uses it during body writing

The script `scripts/fetch-title.mjs` was not deleted and remains fully functional (with Wayback Machine fallback). An existing spec at `openspec/specs/url-preprocessing/spec.md` defines the requirements.

## Goals / Non-Goals

**Goals:**

- Restore hash-escape rule so Obsidian does not create garbage tags from `C#`, `#42`, etc.
- Restore URL preprocessing so card bodies use `[title](url)` instead of bare URLs
- Place the hash-escape rule in two locations for redundancy (CLAUDE.md + inline in Step 5)

**Non-Goals:**

- Adding fetch-title support to tm-enrich (no evidence of bare URL problems there yet)
- Creating a new preprocessing script (the existing fetch-title.mjs is sufficient)
- Modifying any hook or validation logic

## Decisions

### D1: Hash-escape in both CLAUDE.md and Step 5 inline

Place the rule in CLAUDE.md as a global fallback (covers enrich, changelog, any future body-writing context) and also inline in tm-capture Step 5's body description (closest to the point of action).

**Alternative considered:** Only in CLAUDE.md — risks being ignored when Step 5 instructions are the LLM's immediate focus. Only in Step 5 — doesn't cover other body-writing contexts.

### D2: LLM-driven URL flow (not script-driven)

Restore the original Step 4.5 design where the LLM scans URLs, calls fetch-title.mjs via Bash, and builds the mapping. This is "Direction A" from the explore session.

**Alternative considered:** A new `preprocess-urls.mjs` script that handles URL detection + fetching. Rejected because URL scanning with natural language context (user-provided titles like "這篇《Rust 指南》") is an LLM strength that JS regex cannot replicate.

### D3: Restore Step 4.5 matching the existing url-preprocessing spec

The existing spec at `openspec/specs/url-preprocessing/spec.md` already defines the complete requirements. The restored Step 4.5 will match these requirements exactly — no spec changes needed.

### D4: SSRF protection in fetch-title.mjs (audit-driven)

Added DNS resolution + IP denylist (`isPrivateIP`) that rejects RFC 1918, loopback, link-local, cloud metadata, and IPv4-mapped IPv6 addresses. Validation runs before every HTTP request including redirect targets. Best-effort guard with documented DNS TOCTOU limitation.

### D5: Charset-aware decoding (audit-driven)

Read `Content-Type` charset header instead of hardcoding UTF-8. Single `TextDecoder` instance created per response with try/catch fallback to UTF-8 for unrecognized charsets. Streaming decode (`{ stream: true }`) replaces the O(n²) `Buffer.concat` per chunk pattern.

### D6: Slug title `~` marker (audit-driven)

AI-inferred slug titles are prefixed with `~` (e.g., `[~我的好文章](url)`) to distinguish them from real fetched titles.

## Risks / Trade-offs

- **[Redundancy]** Hash-escape appears in two places → minor maintenance burden, but the rule is stable and unlikely to change. The benefit (resilience against accidental removal) outweighs the cost.
- **[Future refactor risk]** Step 4.5 could be accidentally removed again in a future refactor → mitigated by the existing spec file serving as the source of truth, and by this change being documented in OpenSpec archives.
- **[DNS TOCTOU]** `validateUrl` and `http.get` each perform independent DNS resolution; a TTL=0 DNS rebinding attack could bypass the check. Accepted as best-effort for a title-fetching utility.
