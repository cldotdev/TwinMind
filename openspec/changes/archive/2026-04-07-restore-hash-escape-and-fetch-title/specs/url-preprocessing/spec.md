## ADDED Requirements

### Requirement: Step 4.5 restored in tm-capture SKILL.md

tm-capture SKILL.md SHALL include a Step 4.5 (URL preprocessing) between Step 4 (Frontmatter) and Step 5 (Body writing) that implements the URL detection, title fetching, and mapping construction defined in `openspec/specs/url-preprocessing/spec.md`.

#### Scenario: tm-capture SKILL.md contains Step 4.5

- **WHEN** the skill file is read
- **THEN** a "Step 4.5 — URL 預處理" section SHALL exist between Step 4 and Step 5

### Requirement: Step 5 body description references url→title mapping

tm-capture SKILL.md Step 5 body template description SHALL instruct the LLM to format external URLs using the url→title mapping from Step 4.5.

#### Scenario: Step 5 references Step 4.5 mapping

- **WHEN** Step 5 body writing instructions are read
- **THEN** they SHALL reference the Step 4.5 url→title mapping for formatting external URLs as `[title](url)`

### Requirement: Slug-inferred titles visually distinguished

When a URL title is inferred from its path slug (fallback level 3), the title SHALL be prefixed with `~` to indicate it is not the page's real title.

#### Scenario: Slug-inferred title used in card body

- **WHEN** a URL's title is inferred from its path slug
- **THEN** the link SHALL be formatted as `[~inferred title](url)`

### Requirement: SSRF protection in fetch-title.mjs

`scripts/fetch-title.mjs` SHALL validate every URL (including redirect targets) by resolving the hostname and rejecting private, reserved, loopback, link-local, cloud metadata, and IPv4-mapped IPv6 addresses before making the HTTP request.

#### Scenario: URL resolves to private IP

- **WHEN** a URL's hostname resolves to an RFC 1918, loopback, or link-local address
- **THEN** the script SHALL reject the request with a "Blocked" error

#### Scenario: URL resolves to IPv4-mapped IPv6 private address

- **WHEN** a URL's hostname resolves to `::ffff:127.0.0.1` or similar mapped private address
- **THEN** the script SHALL strip the `::ffff:` prefix and apply the same IPv4 denylist

#### Scenario: Redirect target resolves to private IP

- **WHEN** a redirect Location header points to a hostname that resolves to a private IP
- **THEN** the script SHALL reject the redirect with a "Blocked" error

### Requirement: Charset-aware title decoding

`scripts/fetch-title.mjs` SHALL detect the response charset from the `Content-Type` header and use `TextDecoder` with the detected charset. If the charset is unrecognized, it SHALL fall back to UTF-8.

#### Scenario: Response has non-UTF-8 charset

- **WHEN** the response Content-Type specifies a charset other than UTF-8 (e.g., Shift_JIS)
- **THEN** the script SHALL decode using that charset

#### Scenario: Response has unrecognized charset

- **WHEN** the Content-Type specifies a charset that TextDecoder does not support
- **THEN** the script SHALL fall back to UTF-8 decoding
