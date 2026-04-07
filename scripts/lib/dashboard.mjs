/**
 * dashboard.mjs — Regenerate vault/PARA/Dashboard.md from vault-index.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
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

function progressBar(done, total) {
  if (total === 0) return '░░░░░░░░░░ 0%';
  const pct = done / total;
  const filled = Math.round(pct * 10);
  const pctLabel = Math.round(pct * 100) + '%';
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ' ' + pctLabel;
}

function readProjectMeta(projectsDir, projectId) {
  const goalPath = join(projectsDir, projectId, 'goal.md');
  if (!existsSync(goalPath)) return { title: projectId, deadline: null };
  const content = readFileSync(goalPath, 'utf8');
  const fm = parseYamlFrontmatter(content);
  return {
    title: (fm.title || projectId).replace(/^["']|["']$/g, ''),
    deadline: fm.deadline || null,
  };
}

export async function regenerateDashboard({ event, vaultRoot }) {
  const indexPath = join(vaultRoot, 'System', 'vault-index.json');
  const dashPath = join(vaultRoot, 'PARA', 'Dashboard.md');
  const projectsDir = join(vaultRoot, 'PARA', 'Projects');

  const index = JSON.parse(readFileSync(indexPath, 'utf8'));

  const now = new Date();
  const dateLabel = now.toISOString().slice(0, 10) + ' ' +
    String(now.getUTCHours()).padStart(2, '0') + ':' +
    String(now.getUTCMinutes()).padStart(2, '0');

  // --- Section 1: Projects ---
  const activeProjects = Object.entries(index.projects ?? {})
    .filter(([, p]) => p.status === 'active');

  let projectsSection = `## 📋 Projects (${activeProjects.length} active)\n\n`;
  if (activeProjects.length === 0) {
    projectsSection += '（目前沒有進行中的專案）\n';
  } else {
    projectsSection += '| Project | Progress | Actions | Tasks | Deadline |\n';
    projectsSection += '|---------|----------|---------|-------|----------|\n';
    for (const [id, p] of activeProjects) {
      const meta = readProjectMeta(projectsDir, id);
      const bar = progressBar(p.tasks_done ?? 0, p.tasks_total ?? 0);
      const activeActions = (p.actions ?? []).filter(a => a.status === 'active').length;
      const totalActions = (p.actions ?? []).length;
      const deadline = meta.deadline || '--';
      projectsSection += `| [[PARA/Projects/${id}/goal\\|${meta.title}]] | ${bar} | ${activeActions}/${totalActions} | ${p.tasks_done ?? 0}/${p.tasks_total ?? 0} | ${deadline} |\n`;
    }
  }

  // --- Section 2: Actions ---
  const activeActions = Object.entries(index.standalone_actions ?? {})
    .filter(([, a]) => a.status === 'active');

  let actionsSection = `## ⚡ Actions (${activeActions.length} independent)\n\n`;
  if (activeActions.length === 0) {
    actionsSection += '（目前沒有進行中的獨立行動）\n';
  } else {
    for (const [, a] of activeActions) {
      const taskInfo = (a.tasks_total ?? 0) > 0
        ? ` · ${a.tasks_done ?? 0}/${a.tasks_total} tasks`
        : '';
      actionsSection += `- [ ] ${a.title}${taskInfo}\n`;
    }
  }

  // --- Section 3: Tasks ---
  const standaloneTasks = index.standalone_tasks ?? [];
  let tasksSection = `## ☑ Tasks (${standaloneTasks.length} standalone)\n\n`;
  if (standaloneTasks.length === 0) {
    tasksSection += '（目前沒有獨立任務）\n';
  } else {
    for (const t of standaloneTasks) {
      if (t.done) {
        const dateStr = t.completed ? ` (${t.completed.slice(5, 10).replace('-', '-')})` : '';
        tasksSection += `- [x] ~~${t.text}~~${dateStr}\n`;
      } else {
        tasksSection += `- [ ] ${t.text}\n`;
      }
    }
  }

  // --- Section 4: Areas ---
  const activeAreas = Object.entries(index.areas ?? {})
    .filter(([, a]) => a.status === 'active');

  let areasSection = `## 🔭 Areas (${activeAreas.length} active)\n\n`;
  if (activeAreas.length === 0) {
    areasSection += '（目前沒有關注領域）\n';
  } else {
    areasSection += '| Area | Projects | Cards |\n';
    areasSection += '|------|----------|-------|\n';
    for (const [id, a] of activeAreas) {
      const projectCount = (a.related_projects ?? []).length;
      const cardCount = (a.related_cards ?? []).length;
      areasSection += `| [[PARA/Areas/${id}\\|${a.name}]] | ${projectCount} | ${cardCount} |\n`;
    }
  }

  // --- Section 5: Inbox ---
  const pendingInbox = Object.entries(index.inbox ?? {})
    .filter(([, item]) => item.status === 'pending');

  const typeEmoji = { memo: '📝', idea: '💡', question: '❓' };

  let inboxSection = `## 📥 Inbox (${pendingInbox.length} pending)\n\n`;
  if (pendingInbox.length === 0) {
    inboxSection += '（目前沒有待處理的 inbox 項目）\n';
  } else {
    inboxSection += '| Type | Content | Created |\n';
    inboxSection += '|------|---------|----------|\n';
    for (const [, item] of pendingInbox) {
      const emoji = typeEmoji[item.type] || '📝';
      const text = item.text.length > 40 ? item.text.slice(0, 40) + '…' : item.text;
      inboxSection += `| ${emoji} ${item.type} | ${text} | ${item.created} |\n`;
    }
  }

  const content = `# TwinMind Dashboard\n> Last updated: ${dateLabel}\n\n${projectsSection}\n${actionsSection}\n${tasksSection}\n${areasSection}\n${inboxSection}`;

  writeFileSync(dashPath, content, 'utf8');
  return 'updated';
}
