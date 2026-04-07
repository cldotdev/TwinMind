/**
 * moc.mjs — MOC threshold checking and create/update/delete for TwinMind vault.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

function parseYamlFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)/);
    if (m) {
      const key = m[1];
      const raw = m[2].trim().replace(/^["']|["']$/g, '');
      result[key] = raw === '' ? null : (isNaN(raw) || raw === '' ? raw : Number(raw));
    }
  }
  return result;
}

function domainToFilename(domain) {
  return domain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-') + '.md';
}

function domainToTitle(domain) {
  return domain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function statusEmoji(status) {
  return { seed: '🌱', growing: '🌿', evergreen: '🌳' }[status] || '🌱';
}

/** Domain description — used as subtitle in MOC */
function domainDescription(domain) {
  const descriptions = {
    'knowledge-management': '個人知識管理的方法論、系統設計與實踐洞見。',
    'software-tools': '軟體工具、開發環境與技術應用的使用心得。',
    'learning': '學習方法、認知科學與自我教育的策略與洞見。',
    'cognitive-science': '認知科學、心智模型與思維方式的探索。',
    'health': '身心健康、睡眠、運動與生活品質的知識。',
    'product-development': '產品開發、設計思維與創業實踐的洞見。',
  };
  return descriptions[domain] || `${domainToTitle(domain)} 領域的知識卡片集合。`;
}

/**
 * Build MOC content from notes belonging to a domain.
 */
function buildMocContent(domain, notes, today) {
  const title = domainToTitle(domain);
  const description = domainDescription(domain);

  // Group notes by type
  const groups = { concept: [], insight: [], source: [], question: [] };
  for (const note of notes) {
    const type = note.type in groups ? note.type : 'concept';
    groups[type].push(note);
  }

  const sectionLabels = {
    concept: 'Concepts',
    insight: 'Insights',
    source: 'Sources',
    question: 'Questions',
  };

  let sections = '';
  for (const [type, label] of Object.entries(sectionLabels)) {
    const items = groups[type];
    if (items.length === 0) continue;
    sections += `\n## ${label}\n\n`;
    for (const note of items) {
      const emoji = statusEmoji(note.status);
      // path like "Cards/foo.md" → wikilink slug "foo"
      const slug = note.path.replace(/^.*\//, '').replace(/\.md$/, '');
      const summary = note.summary ? note.summary.split('——')[0].split('。')[0] : '';
      sections += `- ${emoji} [[${slug}|${note.title}]]${summary ? ' — ' + summary : ''}\n`;
    }
  }

  const cardCount = notes.length;

  return `# ${title} Map of Content\n\n${description}${sections}\n---\n*${cardCount} cards · Last updated: ${today}*\n`;
}

/**
 * Check MOC thresholds and create/update/delete MOC files as needed.
 * @returns {string} status summary
 */
export async function checkMOC({ event, vaultRoot }) {
  const configPath = join(vaultRoot, 'System', 'config.md');
  const indexPath = join(vaultRoot, 'System', 'vault-index.json');
  const atlasDir = join(vaultRoot, 'Atlas');

  if (!existsSync(configPath)) throw new Error(`config.md not found at ${configPath}`);
  if (!existsSync(indexPath)) throw new Error(`vault-index.json not found at ${indexPath}`);

  const config = parseYamlFrontmatter(readFileSync(configPath, 'utf8'));
  const thresholdCreate = config.moc_threshold_create ?? 5;
  const thresholdSplit = config.moc_threshold_split ?? 20;

  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const domainCounts = index.stats?.domains ?? {};
  const notes = Object.values(index.notes ?? {});

  // Determine affected domains from event context
  const affectedDomains = event.event_context?.domains ?? Object.keys(domainCounts);

  const today = new Date().toISOString().slice(0, 10);
  const actions = [];

  for (const domain of affectedDomains) {
    const count = domainCounts[domain] ?? 0;
    const mocFilename = domainToFilename(domain);
    const mocPath = join(atlasDir, mocFilename);
    const mocExists = existsSync(mocPath);

    if (count >= thresholdCreate) {
      // Filter notes belonging to this domain
      const domainNotes = notes.filter(n => Array.isArray(n.domain) && n.domain.includes(domain));

      if (!mocExists) {
        // Create MOC
        const content = buildMocContent(domain, domainNotes, today);
        writeFileSync(mocPath, content, 'utf8');
        const title = domainToTitle(domain);
        process.stdout.write(`MOC: ${title} created\n`);
        actions.push(`${title} created`);
      } else {
        // Update MOC
        const content = buildMocContent(domain, domainNotes, today);
        writeFileSync(mocPath, content, 'utf8');
        const title = domainToTitle(domain);
        process.stdout.write(`MOC: ${title} updated\n`);
        actions.push(`${title} updated`);
      }
    } else if (mocExists) {
      // Delete MOC — domain dropped below threshold
      unlinkSync(mocPath);
      const title = domainToTitle(domain);
      process.stdout.write(`MOC: ${title} deleted\n`);
      actions.push(`${title} deleted`);
    }
    // else: count < threshold and no MOC exists — nothing to do
  }

  if (actions.length === 0) return 'no-change';
  return actions.join(', ');
}
