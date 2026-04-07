#!/usr/bin/env node
/**
 * post-op.mjs — Programmatic post-operation pipeline for TwinMind vault.
 *
 * Usage:
 *   node scripts/post-op.mjs --layer <knowledge|action|both> --event '<JSON>'
 *
 * Exit codes:
 *   0 — success
 *   1 — failure (error printed to stderr)
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeChangelog } from './lib/changelog.mjs';
import { checkMOC } from './lib/moc.mjs';
import { regenerateHome } from './lib/home.mjs';
import { regenerateDashboard } from './lib/dashboard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const vaultRoot = resolve(__dirname, '..', 'vault');

// --- CLI argument parsing ---

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--layer' && argv[i + 1]) {
      args.layer = argv[++i];
    } else if (argv[i] === '--event' && argv[i + 1]) {
      args.event = argv[++i];
    }
  }
  return args;
}

function fail(step, message) {
  process.stderr.write(`post-op failed | step=${step} | error: ${message}\n`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

// Validate --layer
const VALID_LAYERS = ['knowledge', 'action', 'both'];
if (!args.layer) {
  fail('parse', '--layer is required (knowledge|action|both)');
}
if (!VALID_LAYERS.includes(args.layer)) {
  fail('parse', `invalid layer "${args.layer}", must be one of: ${VALID_LAYERS.join(', ')}`);
}

// Validate --event
if (!args.event) {
  fail('parse', '--event is required (JSON string with event_type and event_context)');
}

let event;
try {
  event = JSON.parse(args.event);
} catch (e) {
  fail('parse', `--event is not valid JSON: ${e.message}`);
}

if (!event.event_type) {
  fail('parse', '--event JSON must contain event_type');
}
if (!event.event_context) {
  fail('parse', '--event JSON must contain event_context');
}

// --- Layer dispatch ---

const layer = args.layer;
const status = {
  changelog: 'skipped',
  moc: 'skipped',
  home: 'skipped',
  dashboard: 'skipped',
};

async function run() {
  // Changelog runs for all layers
  try {
    status.changelog = await writeChangelog({ event, vaultRoot });
  } catch (e) {
    fail('changelog', e.message);
  }

  if (layer === 'knowledge' || layer === 'both') {
    try {
      status.moc = await checkMOC({ event, vaultRoot });
    } catch (e) {
      fail('moc', e.message);
    }

    try {
      status.home = await regenerateHome({ event, vaultRoot });
    } catch (e) {
      fail('home', e.message);
    }
  }

  if (layer === 'action' || layer === 'both') {
    try {
      status.dashboard = await regenerateDashboard({ event, vaultRoot });
    } catch (e) {
      fail('dashboard', e.message);
    }
  }

  process.stdout.write(
    `post-op done | layer=${layer} | changelog ✓ | MOC: ${status.moc} | Home: ${status.home} | Dashboard: ${status.dashboard}\n`
  );
}

run().catch((e) => fail('run', e.message));
