#!/usr/bin/env node
/**
 * update-index.mjs — Programmatic vault-index.json CRUD operations.
 *
 * Usage:
 *   node scripts/update-index.mjs <subcommand> '<JSON payload>'
 *
 * Subcommands: add-card, update-card, delete-card, add-link
 *
 * Exit codes:
 *   0 — success (stdout: "ok | <command> | <key details>")
 *   1 — failure (stderr: "error: <description>")
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const indexPath = resolve(__dirname, '..', 'vault', 'System', 'vault-index.json');

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function ok(command, details) {
  process.stdout.write(`ok | ${command} | ${details}\n`);
}

function readIndex() {
  const raw = readFileSync(indexPath, 'utf8');
  return JSON.parse(raw);
}

function writeIndex(data) {
  data.stats.last_updated = new Date().toISOString();
  writeFileSync(indexPath, JSON.stringify(data, null, 2), 'utf8');
}

// --- Subcommand: add-card ---

function addCard(payload) {
  const { id, title, path, type, status, domain, summary, links_to: rawLinks } = payload;

  if (!id || !title || !path || !type || !status || !domain || !summary) {
    fail('missing required fields: id, title, path, type, status, domain, summary');
  }
  if (!Array.isArray(domain)) fail('domain must be an array');

  const links_to = Array.isArray(rawLinks) ? rawLinks : [];

  const data = readIndex();
  const notes = data.notes;

  if (notes[id]) fail(`card ${id} already exists`);

  // Resolve valid link targets
  const resolvedLinks = [];
  for (const targetId of links_to) {
    if (!notes[targetId]) {
      process.stderr.write(`warn: target ${targetId} not found, skipping\n`);
    } else {
      resolvedLinks.push(targetId);
    }
  }

  // Add new note entry
  notes[id] = {
    title,
    path,
    type,
    status,
    domain,
    summary,
    links_to: resolvedLinks,
    linked_from: [],
    link_count: resolvedLinks.length,
  };

  // Update targets' linked_from and link_count
  for (const targetId of resolvedLinks) {
    if (!notes[targetId].linked_from.includes(id)) {
      notes[targetId].linked_from.push(id);
    }
    notes[targetId].link_count = notes[targetId].links_to.length + notes[targetId].linked_from.length;
  }

  // Update stats
  data.stats.total_cards += 1;
  data.stats.total_links += resolvedLinks.length;
  for (const tag of domain) {
    data.stats.domains[tag] = (data.stats.domains[tag] || 0) + 1;
  }

  writeIndex(data);
  ok('add-card', `id=${id} title="${title}" links=${resolvedLinks.length}`);
}

// --- Subcommand: update-card ---

function updateCard(payload) {
  const { id, ...fields } = payload;
  if (!id) fail('missing required field: id');

  const UPDATABLE = ['title', 'type', 'status', 'domain', 'summary'];
  const data = readIndex();
  const notes = data.notes;

  if (!notes[id]) fail(`card ${id} not found`);

  const note = notes[id];
  const updatedFields = [];

  for (const key of UPDATABLE) {
    if (key in fields) {
      if (key === 'domain') {
        // Domain diff
        const oldDomains = note.domain || [];
        const newDomains = fields.domain;
        if (!Array.isArray(newDomains)) fail('domain must be an array');

        const removed = oldDomains.filter(d => !newDomains.includes(d));
        const added = newDomains.filter(d => !oldDomains.includes(d));

        for (const tag of removed) {
          if (data.stats.domains[tag] !== undefined) {
            data.stats.domains[tag] -= 1;
            if (data.stats.domains[tag] <= 0) delete data.stats.domains[tag];
          }
        }
        for (const tag of added) {
          data.stats.domains[tag] = (data.stats.domains[tag] || 0) + 1;
        }
        note.domain = newDomains;
      } else {
        note[key] = fields[key];
      }
      updatedFields.push(key);
    }
  }

  writeIndex(data);
  ok('update-card', `id=${id} fields=${updatedFields.join(',')}`);
}

// --- Subcommand: delete-card ---

function deleteCard(payload) {
  const { id } = payload;
  if (!id) fail('missing required field: id');

  const data = readIndex();
  const notes = data.notes;

  if (!notes[id]) fail(`card ${id} not found`);

  const note = notes[id];
  const { domain, links_to = [], linked_from = [] } = note;

  // Remove from notes
  delete notes[id];

  // Update stats.total_cards
  data.stats.total_cards -= 1;

  // Update domains
  for (const tag of (domain || [])) {
    if (data.stats.domains[tag] !== undefined) {
      data.stats.domains[tag] -= 1;
      if (data.stats.domains[tag] <= 0) delete data.stats.domains[tag];
    }
  }

  // Clean up links_to: remove deleted card's ID from each target's linked_from
  for (const targetId of links_to) {
    if (notes[targetId]) {
      notes[targetId].linked_from = notes[targetId].linked_from.filter(x => x !== id);
      notes[targetId].link_count = notes[targetId].links_to.length + notes[targetId].linked_from.length;
    }
  }

  // Clean up linked_from: remove deleted card's ID from each source's links_to
  for (const sourceId of linked_from) {
    if (notes[sourceId]) {
      notes[sourceId].links_to = notes[sourceId].links_to.filter(x => x !== id);
      notes[sourceId].link_count = notes[sourceId].links_to.length + notes[sourceId].linked_from.length;
    }
  }

  // Recalculate total_links from remaining notes
  data.stats.total_links = Object.values(notes).reduce((sum, n) => sum + (n.links_to || []).length, 0);

  const cleanedLinks = links_to.length + linked_from.length;
  writeIndex(data);
  ok('delete-card', `id=${id} cleaned_links=${cleanedLinks}`);
}

// --- Subcommand: add-link ---

function addLink(payload) {
  const { source, target } = payload;
  if (!source) fail('missing required field: source');
  if (!target) fail('missing required field: target');

  const data = readIndex();
  const notes = data.notes;

  if (!notes[source]) fail(`card ${source} not found`);
  if (!notes[target]) fail(`card ${target} not found`);

  if (notes[source].links_to.includes(target)) {
    fail(`link already exists from ${source} to ${target}`);
  }

  notes[source].links_to.push(target);
  notes[source].link_count = notes[source].links_to.length + notes[source].linked_from.length;

  notes[target].linked_from.push(source);
  notes[target].link_count = notes[target].links_to.length + notes[target].linked_from.length;

  data.stats.total_links += 1;

  writeIndex(data);
  ok('add-link', `source=${source} target=${target}`);
}

// --- CLI dispatch ---

const [,, subcommand, payloadArg] = process.argv;

const VALID_COMMANDS = ['add-card', 'update-card', 'delete-card', 'add-link'];

if (!subcommand || !VALID_COMMANDS.includes(subcommand)) {
  if (subcommand) {
    fail(`unknown command "${subcommand}"`);
  } else {
    fail('subcommand required (add-card|update-card|delete-card|add-link)');
  }
}

if (!payloadArg) fail('invalid JSON payload');

let payload;
try {
  payload = JSON.parse(payloadArg);
} catch {
  fail('invalid JSON payload');
}

switch (subcommand) {
  case 'add-card':    addCard(payload);    break;
  case 'update-card': updateCard(payload); break;
  case 'delete-card': deleteCard(payload); break;
  case 'add-link':    addLink(payload);    break;
}
