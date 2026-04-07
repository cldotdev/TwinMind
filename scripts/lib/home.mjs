/**
 * home.mjs — Regenerate vault/Home.md from vault-index.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfig } from './resolve-config.mjs';
import { readProjectMeta } from './project-meta.mjs';

function statusEmoji(status) {
  return { seed: '🌱', growing: '🌿', evergreen: '🌳' }[status] || '🌱';
}

function mocFilenameToTitle(filename) {
  return filename.replace(/\.md$/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Count cards in a MOC by reading its content and counting list items under sections.
 * Fallback: use vault-index domain count.
 */
function countMocCards(mocPath) {
  try {
    const content = readFileSync(mocPath, 'utf8');
    const match = content.match(/\*(\d+) cards/);
    if (match) return parseInt(match[1], 10);
    // Count bullet items in the file (exclude non-card lines)
    return (content.match(/^- [🌱🌿🌳]/gmu) || []).length;
  } catch {
    return 0;
  }
}

export async function regenerateHome({ vaultRoot }) {
  const indexPath = join(vaultRoot, 'System', 'vault-index.json');
  const homePath = join(vaultRoot, 'Home.md');
  const atlasDir = join(vaultRoot, 'Atlas');
  const projectsDir = join(vaultRoot, 'PARA', 'Projects');

  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const config = resolveConfig();
  const recentCount = config.recent_cards_count ?? 5;

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // --- Block 1: Active Projects ---
  const activeProjects = Object.entries(index.projects ?? {})
    .filter(([, p]) => p.status === 'active');

  let projectsBlock = '';
  if (activeProjects.length === 0) {
    projectsBlock = '（目前沒有進行中的專案）';
  } else {
    projectsBlock = activeProjects.map(([id, p]) => {
      const meta = readProjectMeta(projectsDir, id);
      const deadline = meta.deadline ? meta.deadline : 'no deadline';
      const cards = p.card_refs ?? 0;
      return `- [[PARA/Projects/${id}/goal|${meta.title}]] — deadline: ${deadline} · ${cards} cards`;
    }).join('\n');
  }

  // --- Block 2: Areas of Focus ---
  const activeAreas = Object.entries(index.areas ?? {})
    .filter(([, a]) => a.status === 'active');

  let areasBlock = '';
  if (activeAreas.length === 0) {
    areasBlock = '（目前沒有關注領域）';
  } else {
    areasBlock = activeAreas.map(([id, a]) => `- [[PARA/Areas/${id}|${a.name}]]`).join('\n');
  }

  // --- Block 3: Knowledge Map (from Atlas/ directory) ---
  let knowledgeMapBlock = '';
  if (existsSync(atlasDir)) {
    const mocFiles = readdirSync(atlasDir).filter(f => f.endsWith('.md'));
    if (mocFiles.length === 0) {
      knowledgeMapBlock = '（尚無 MOC，卡片累積達門檻後自動建立）';
    } else {
      knowledgeMapBlock = mocFiles.map(f => {
        const slug = f.replace(/\.md$/, '');
        const title = mocFilenameToTitle(f);
        const count = countMocCards(join(atlasDir, f));
        return `- [[Atlas/${slug}|${title}]] (${count})`;
      }).join('\n');
    }
  } else {
    knowledgeMapBlock = '（尚無 MOC）';
  }

  // --- Block 4: Recently Updated (top N by ID descending) ---
  const allNotes = Object.entries(index.notes ?? {})
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, recentCount);

  let recentBlock = '';
  if (allNotes.length === 0) {
    recentBlock = '（尚無卡片）';
  } else {
    recentBlock = allNotes.map(([id, n]) => {
      const emoji = statusEmoji(n.status);
      const slug = n.path.replace(/^.*?\//, '').replace(/\.md$/, '');
      const folder = n.path.startsWith('Sources/') ? 'Sources' : 'Cards';
      const date = `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
      return `- ${emoji} [[${folder}/${slug}|${n.title}]] — ${date}`;
    }).join('\n');
  }

  // --- Block 5: Seeds to Develop ---
  const seeds = Object.entries(index.notes ?? {})
    .filter(([, n]) => n.status === 'seed')
    .sort(([a], [b]) => b.localeCompare(a));

  let seedsBlock = '';
  if (seeds.length === 0) {
    seedsBlock = '（目前沒有需要發展的 seed）';
  } else {
    seedsBlock = seeds.map(([, n]) => {
      const emoji = statusEmoji(n.status);
      const folder = n.path.startsWith('Sources/') ? 'Sources' : 'Cards';
      const slug = n.path.replace(/^.*?\//, '').replace(/\.md$/, '');
      return `- ${emoji} [[${folder}/${slug}|${n.title}]]`;
    }).join('\n');
  }

  const content = `---
title: Home
description: TwinMind 知識庫入口
updated: ${now}
---

<!--
Knowledge Layer Entry Point — 由 scripts/post-op.mjs (layer=knowledge/both) 自動重建。
行動層追蹤請見 [[PARA/Dashboard|Dashboard]]。
-->

# Home

> 知識面入口。行動面請見 [[PARA/Dashboard|Dashboard]]。

## 進行中專案

${projectsBlock}

## 關注領域

${areasBlock}

## 知識地圖

${knowledgeMapBlock}

## 最近新增

${recentBlock}

## 待發展 (seeds)

${seedsBlock}
`;

  writeFileSync(homePath, content, 'utf8');
  return 'updated';
}
