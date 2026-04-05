#!/usr/bin/env node

// AfterTool hook: validates Home.md structural format after write_file/replace on vault/Home.md
// Exit 0 = pass (with context), Exit 2 = block (with error)

const fs = require('fs');

const EXPECTED_SECTIONS = [
  '進行中專案',
  '關注領域',
  '知識地圖',
  '最近新增',
  '待發展 (seeds)'
];

const VALID_EMOJIS = ['\u{1F331}', '\u{1F33F}', '\u{1F333}']; // 🌱 🌿 🌳

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

function succeed(msg) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'AfterTool',
      additionalContext: msg
    }
  };
  process.stdout.write(JSON.stringify(output) + '\n');
  process.exit(0);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    return fail('validate-home: Failed to parse hook stdin JSON');
  }

  const filePath = data?.tool_input?.file_path;
  if (!filePath) {
    return succeed('validate-home: Skipped (no file_path in tool_input)');
  }

  const normalized = filePath.replace(/\\/g, '/');
  if (!normalized.includes('/vault/Home.md')) {
    return succeed('validate-home: Skipped (not vault/Home.md)');
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return fail(`validate-home: Cannot read file ${filePath}`);
  }

  const lines = content.split(/\r?\n/);

  // Extract all H2 sections
  const h2Sections = [];
  for (const line of lines) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      h2Sections.push(match[1].trim());
    }
  }

  // Check for non-spec sections
  const unexpected = h2Sections.filter(s => !EXPECTED_SECTIONS.includes(s));
  if (unexpected.length > 0) {
    return fail(`validate-home: Unexpected H2 section(s): ${unexpected.map(s => `"${s}"`).join(', ')}. Allowed: ${EXPECTED_SECTIONS.map(s => `"${s}"`).join(', ')}`);
  }

  // Check all expected sections are present
  const missing = EXPECTED_SECTIONS.filter(s => !h2Sections.includes(s));
  if (missing.length > 0) {
    return fail(`validate-home: Missing required H2 section(s): ${missing.map(s => `"${s}"`).join(', ')}`);
  }

  // Check section order
  for (let i = 0; i < EXPECTED_SECTIONS.length; i++) {
    if (EXPECTED_SECTIONS[i] !== h2Sections[i]) {
      return fail(`validate-home: Wrong section order. Expected: ${EXPECTED_SECTIONS.map(s => `"${s}"`).join(' -> ')}. Got: ${h2Sections.map(s => `"${s}"`).join(' -> ')}`);
    }
  }

  // Check for markdown link syntax [text](path) in content sections (below the H1)
  const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/;
  const offendingMdLinks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('# ') || line.startsWith('> ')) continue;
    if (mdLinkPattern.test(line)) {
      offendingMdLinks.push(`L${i + 1}: ${line.trim()}`);
    }
  }
  if (offendingMdLinks.length > 0) {
    return fail(`validate-home: Found markdown link syntax [text](path) instead of [[wikilink]]: ${offendingMdLinks.join('; ')}`);
  }

  // Check emoji prefixes in the "最近新增" section
  let inRecentSection = false;
  const missingEmojiLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      inRecentSection = line.includes('最近新增');
      continue;
    }
    if (inRecentSection && line.startsWith('- ')) {
      const itemText = line.slice(2).trim();
      const hasEmoji = VALID_EMOJIS.some(e => itemText.startsWith(e));
      if (!hasEmoji) {
        missingEmojiLines.push(`L${i + 1}: ${line.trim()}`);
      }
    }
  }
  if (missingEmojiLines.length > 0) {
    return fail(`validate-home: List items in "最近新增" section missing emoji prefix (🌱/🌿/🌳): ${missingEmojiLines.join('; ')}`);
  }

  return succeed(`validate-home: OK — ${h2Sections.length} sections in correct order`);
});
