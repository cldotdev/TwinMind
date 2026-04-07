#!/usr/bin/env node

// Unified PostToolUse validator for TwinMind plugin.
// Dispatches to the appropriate validation logic based on file path.
// Single process per Write/Edit instead of 5 separate processes.
// Exit 0 = pass (with context), Exit 2 = block (with error)

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = 'TwinMind.md';

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

function succeed(msg) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: msg
    }
  };
  process.stdout.write(JSON.stringify(output) + '\n');
  process.exit(0);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const yaml = match[1];
  const fields = {};
  for (const line of yaml.split(/\r?\n/)) {
    const m = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (m) {
      let value = m[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      fields[m[1]] = value;
    }
  }
  return fields;
}

function readFileContent(filePath, hookName) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return fail(`${hookName}: Cannot read file ${filePath}`);
  }
}

function requireFrontmatter(content, hookName) {
  const fields = parseFrontmatter(content);
  if (!fields) {
    return fail(`${hookName}: No YAML frontmatter found (missing --- delimiters)`);
  }
  return fields;
}

function checkRequired(fields, required, hookName) {
  const missing = required.filter(f => !(f in fields));
  if (missing.length > 0) {
    return fail(`${hookName}: Missing required field(s): ${missing.join(', ')}`);
  }
}

function checkEnum(fields, field, valid, hookName) {
  if (field in fields && !valid.includes(fields[field])) {
    return fail(`${hookName}: Invalid ${field} "${fields[field]}" (allowed: ${valid.join(', ')})`);
  }
}

// --- Validators ---

function validateCard(filePath) {
  const H = 'validate-card';
  const content = readFileContent(filePath, H);
  const fields = requireFrontmatter(content, H);
  checkRequired(fields, ['id', 'title', 'type', 'status', 'domain', 'created', 'updated'], H);
  checkEnum(fields, 'type', ['concept', 'insight', 'source', 'question'], H);
  checkEnum(fields, 'status', ['seed', 'growing', 'evergreen'], H);
  checkEnum(fields, 'confidence', ['low', 'medium', 'high'], H);
  return succeed(`${H}: OK — type=${fields.type}, status=${fields.status}`);
}

function validateInbox(filePath) {
  const H = 'validate-inbox';
  const content = readFileContent(filePath, H);
  const fields = requireFrontmatter(content, H);
  checkRequired(fields, ['id', 'type', 'text', 'created', 'status'], H);
  checkEnum(fields, 'type', ['memo', 'idea'], H);
  checkEnum(fields, 'status', ['pending', 'promoted', 'dismissed'], H);
  return succeed(`${H}: OK — type=${fields.type}, status=${fields.status}`);
}

function validateAction(filePath) {
  const H = 'validate-action';
  const content = readFileContent(filePath, H);
  const fields = requireFrontmatter(content, H);
  checkRequired(fields, ['id', 'title', 'status', 'created'], H);
  checkEnum(fields, 'status', ['active', 'done'], H);
  return succeed(`${H}: OK — title=${fields.title}, status=${fields.status}`);
}

function validateProjectFiles(filePath, normalized) {
  const H = 'validate-project-files';

  const basename = path.basename(normalized);
  if (basename !== 'actions.md' && basename !== 'tasks.md') {
    return succeed(`${H}: Skipped (not actions.md or tasks.md)`);
  }

  const pathMatch = normalized.match(/\/PARA\/Projects\/([^/]+)\//);
  if (!pathMatch) {
    return succeed(`${H}: Skipped (cannot extract project name from path)`);
  }
  const expectedProject = pathMatch[1];

  const content = readFileContent(filePath, H);
  const fields = requireFrontmatter(content, H);

  if (!('project' in fields)) {
    return fail(`${H}: Missing required field: project`);
  }
  if (!('updated' in fields)) {
    return fail(`${H}: Missing required field: updated`);
  }
  if (fields.project !== expectedProject) {
    return fail(`${H}: Project field mismatch — frontmatter says "${fields.project}", directory is "${expectedProject}"`);
  }

  return succeed(`${H}: OK — project=${fields.project}, file=${basename}`);
}

function validateIndex(filePath) {
  const H = 'validate-index';

  let index;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    index = JSON.parse(raw);
  } catch (e) {
    return fail(`${H}: Invalid JSON — ${e.message}`);
  }

  const notes = index.notes || {};
  const stats = index.stats || {};
  const noteIds = Object.keys(notes);

  // Invariant 1: total_cards == notes key count
  const actualCards = noteIds.length;
  if (stats.total_cards !== actualCards) {
    return fail(`${H}: total_cards mismatch — stats says ${stats.total_cards}, actual notes count is ${actualCards}`);
  }

  // Invariant 2: total_links == sum of all links_to lengths
  let totalLinksTo = 0;
  for (const id of noteIds) {
    const linksTo = notes[id].links_to;
    if (Array.isArray(linksTo)) {
      totalLinksTo += linksTo.length;
    }
  }
  if (stats.total_links !== totalLinksTo) {
    return fail(`${H}: total_links mismatch — stats says ${stats.total_links}, sum of links_to is ${totalLinksTo}`);
  }

  // Invariant 3: Bidirectional link integrity
  for (const idA of noteIds) {
    const linksTo = notes[idA].links_to || [];
    for (const idB of linksTo) {
      if (!notes[idB]) {
        return fail(`${H}: Broken link — note ${idA} links_to ${idB}, but note ${idB} does not exist`);
      }
      const linkedFrom = notes[idB].linked_from || [];
      if (!linkedFrom.includes(idA)) {
        return fail(`${H}: Bidirectional break — note ${idA} links_to ${idB}, but ${idB}.linked_from does not contain ${idA}`);
      }
    }
    const linkedFrom = notes[idA].linked_from || [];
    for (const idB of linkedFrom) {
      if (!notes[idB]) {
        return fail(`${H}: Broken backlink — note ${idA} linked_from ${idB}, but note ${idB} does not exist`);
      }
      const otherLinksTo = notes[idB].links_to || [];
      if (!otherLinksTo.includes(idA)) {
        return fail(`${H}: Bidirectional break — note ${idA} linked_from ${idB}, but ${idB}.links_to does not contain ${idA}`);
      }
    }
  }

  // Invariant 4: Version check
  if (stats.version !== undefined || index.version !== undefined) {
    if (index.version !== 2) {
      return fail(`${H}: Version mismatch — expected 2, got ${index.version}`);
    }
  }

  // Invariant 5: Inbox count
  const inbox = index.inbox || {};
  const pendingInbox = Object.values(inbox).filter(i => i.status === 'pending').length;
  if (stats.total_inbox !== undefined && stats.total_inbox !== pendingInbox) {
    return fail(`${H}: total_inbox mismatch — stats says ${stats.total_inbox}, actual pending inbox count is ${pendingInbox}`);
  }

  // Invariant 6: Actions count
  const standaloneActions = index.standalone_actions || {};
  const activeActions = Object.values(standaloneActions).filter(a => a.status === 'active').length;
  if (stats.total_actions !== undefined && stats.total_actions !== activeActions) {
    return fail(`${H}: total_actions mismatch — stats says ${stats.total_actions}, actual active standalone actions is ${activeActions}`);
  }

  // Invariant 7: Standalone tasks count
  const standaloneTasks = index.standalone_tasks || [];
  const activeTasks = standaloneTasks.filter(t => !t.done).length;
  if (stats.total_tasks_standalone !== undefined && stats.total_tasks_standalone !== activeTasks) {
    return fail(`${H}: total_tasks_standalone mismatch — stats says ${stats.total_tasks_standalone}, actual active standalone tasks is ${activeTasks}`);
  }

  // Invariant 8: Domain counts
  const domainCounts = {};
  for (const id of noteIds) {
    const domains = notes[id].domain || [];
    for (const d of domains) {
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
  }
  const statsDomains = stats.domains || {};
  for (const d of Object.keys(statsDomains)) {
    const actual = domainCounts[d] || 0;
    if (statsDomains[d] !== actual) {
      return fail(`${H}: Domain count mismatch for "${d}" — stats says ${statsDomains[d]}, actual is ${actual}`);
    }
  }
  for (const d of Object.keys(domainCounts)) {
    if (!(d in statsDomains)) {
      return fail(`${H}: Domain "${d}" found in ${domainCounts[d]} note(s) but missing from stats.domains`);
    }
  }

  return succeed(`${H}: OK — cards=${actualCards}, links=${totalLinksTo}, inbox=${pendingInbox}, actions=${activeActions}, tasks=${activeTasks}, last_updated=${stats.last_updated || 'unknown'}`);
}

// --- Main dispatcher ---

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    return fail('validate: Failed to parse hook stdin JSON');
  }

  const cwd = data.cwd || process.cwd();
  if (!fs.existsSync(path.join(cwd, CONFIG_FILE))) {
    return succeed('validate: Skipped (not a TwinMind project)');
  }

  const filePath = data?.tool_input?.file_path;
  if (!filePath) {
    return succeed('validate: Skipped (no file_path)');
  }

  const normalized = filePath.replace(/\\/g, '/');

  if (normalized.includes('/Cards/') || normalized.includes('/Sources/')) {
    return validateCard(filePath);
  }
  if (normalized.includes('/PARA/Inbox/')) {
    return validateInbox(filePath);
  }
  if (normalized.includes('/PARA/Actions/')) {
    return validateAction(filePath);
  }
  if (normalized.includes('/PARA/Projects/')) {
    return validateProjectFiles(filePath, normalized);
  }
  if (normalized.endsWith('/vault-index.json')) {
    return validateIndex(filePath);
  }

  return succeed('validate: Skipped (no matching validator)');
});
