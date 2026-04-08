---
name: setup
description: "Initialize a new TwinMind vault in the current directory. Creates TwinMind.md configuration and vault directory structure from templates. Use when starting a fresh knowledge vault or setting up TwinMind in a new project."
license: MIT
---

# TwinMind Setup

Initialize a new TwinMind vault in the current working directory.

## Pre-flight Checks

Before proceeding, check for existing installations:

1. **TwinMind.md exists** → Warn: "TwinMind.md already exists in this directory. Overwrite?" Ask user to confirm or abort.
2. **Old-style `.claude/skills/tm-*` directories exist** → Warn: "Detected old-style TwinMind installation (.claude/skills/tm-*). This plugin-based setup is separate. Consider removing old files to avoid confusion."
3. **Vault directory already exists and contains files** → Warn: "Directory `<vault_dir>/` already exists with content. Setup will not overwrite existing vault data. Only missing structure files will be created."

If all checks pass or user confirms, proceed.

## Interactive Configuration

Ask the user for customization (or accept defaults):

1. **Vault directory name** — default: `vault`
2. **Locale** — default: `zh-TW`
3. **Domains** — default: empty list (AI creates as needed)

## Setup Steps

1. Copy `${CLAUDE_PLUGIN_ROOT}/templates/TwinMind.md` to `<cwd>/TwinMind.md`
2. Update frontmatter values based on user's choices (vault_dir, locale, domains)
3. Copy `${CLAUDE_PLUGIN_ROOT}/templates/vault/` directory structure to `<cwd>/<vault_dir>/`
   - Create all subdirectories: System/, Cards/, Sources/, Atlas/, PARA/Inbox/, PARA/Actions/, PARA/Projects/, PARA/Archive/, PARA/Areas/, PARA/Tasks/
   - Copy initial files: System/vault-index.json, Home.md, PARA/Dashboard.md
   - Skip directories/files that already exist
4. Create `.gitignore` in vault root if not exists, with `.obsidian/` entry

## Completion

Report:

- Created TwinMind.md at project root
- Created vault structure at `<vault_dir>/`
- Next steps: "Open this directory in Obsidian to browse your vault. Start talking to Claude to capture knowledge!"
