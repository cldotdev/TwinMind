#!/usr/bin/env node
/**
 * session-start.mjs — SessionStart hook for TwinMind plugin.
 *
 * Detects TwinMind projects by checking for TwinMind.md in the working directory.
 * If found, outputs router-prompt.md content to stdout for context injection.
 *
 * Cross-platform: uses only Node.js built-ins, no shell dependencies.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  // Read hook input from stdin (JSON with cwd field)
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const cwd = input.cwd;

  if (!cwd) {
    process.exit(0);
  }

  // Check if TwinMind.md exists in the working directory
  const configPath = join(cwd, 'TwinMind.md');
  if (!existsSync(configPath)) {
    process.exit(0); // Not a TwinMind project — exit silently
  }

  // Output router prompt to stdout (injected as Claude context)
  const pluginRoot = join(import.meta.dirname, '..');
  const routerPath = join(pluginRoot, 'router-prompt.md');

  if (existsSync(routerPath)) {
    const content = readFileSync(routerPath, 'utf8');
    process.stdout.write(content);
  }
}

main().catch((e) => {
  process.stderr.write(`twinmind session-start: ${e.message}\n`);
  process.exit(0);
});
