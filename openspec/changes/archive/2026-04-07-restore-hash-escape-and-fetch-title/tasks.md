## 1. Hash-escape rule

- [x] 1.1 Append "## Markdown 注意事項" section to CLAUDE.md with hash-escape rule
- [x] 1.2 Update tm-capture SKILL.md Step 5 body description to include inline hash-escape reminder

## 2. URL preprocessing

- [x] 2.1 Restore Step 4.5 (URL 預處理) in tm-capture SKILL.md between Step 4 and Step 5
- [x] 2.2 Update Step 5 body description to reference url→title mapping from Step 4.5

## 3. fetch-title.mjs hardening (audit-driven)

- [x] 3.1 Add SSRF protection: isPrivateIP + validateUrl with DNS resolution
- [x] 3.2 Add IPv4-mapped IPv6 (::ffff:) handling to isPrivateIP
- [x] 3.3 Guard res.on("error") with if (!found) to prevent post-resolve rejection
- [x] 3.4 Add charset detection from Content-Type header with TextDecoder fallback
- [x] 3.5 Replace O(n²) Buffer.concat per chunk with incremental streaming decode
- [x] 3.6 Add DNS TOCTOU limitation comment to validateUrl
- [x] 3.7 Mark slug-inferred titles with ~ prefix in SKILL.md Step 4.5

## 4. Incidental fixes

- [x] 4.1 Fix garbled text in CLAUDE.md (須立即, 已自動處理)
- [x] 4.2 Auto-fix 15 pre-existing markdown lint issues in CLAUDE.md (MD031/MD032)
