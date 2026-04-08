/**
 * resolve-config.mjs — TwinMind.md configuration and YAML frontmatter utilities.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Parse YAML frontmatter from a Markdown file.
 * Supports flat key: value pairs and simple arrays like [a, b, c].
 * @param {string} content - Raw Markdown content with --- delimiters
 * @returns {object} Parsed frontmatter object (empty object if no frontmatter)
 */
export function parseYamlFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();

    // Remove surrounding quotes
    val = val.replace(/^["']|["']$/g, '');

    // Array: [a, b, c]
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      result[key] = inner === '' ? [] : inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    // Number
    if (val !== '' && !Number.isNaN(Number(val))) {
      result[key] = Number(val);
      continue;
    }

    // Null
    if (val === 'null' || val === '') {
      result[key] = null;
      continue;
    }

    result[key] = val;
  }

  return result;
}

let _configCache = null;
let _configCwd = null;

/**
 * Read and parse TwinMind.md configuration. Cached per process.
 * @param {string} cwd - Project root containing TwinMind.md
 * @returns {object} Parsed config object
 */
export function resolveConfig(cwd = process.cwd()) {
  if (_configCache && _configCwd === cwd) return _configCache;

  const configPath = join(cwd, 'TwinMind.md');
  const raw = readFileSync(configPath, 'utf8');
  const config = parseYamlFrontmatter(raw);
  if (Object.keys(config).length === 0) {
    throw new Error('TwinMind.md: frontmatter not found');
  }

  _configCache = config;
  _configCwd = cwd;
  return config;
}

/**
 * Resolve the absolute path to the vault root directory.
 * @param {string} cwd - Project root containing TwinMind.md
 * @returns {string} Absolute path to vault directory
 */
export function resolveVaultRoot(cwd = process.cwd()) {
  const config = resolveConfig(cwd);
  return join(cwd, config.vault_dir || 'vault');
}
