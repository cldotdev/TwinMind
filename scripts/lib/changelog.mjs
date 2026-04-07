/**
 * changelog.mjs — Append changelog entries to vault/System/changelog-YYYY-MM.md
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

/**
 * Build a human-readable changelog entry from the event payload.
 */
function buildEntry(event) {
  const { event_type, event_context: ctx } = event;
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  let description = '';
  const details = [];

  switch (event_type) {
    case 'CARD_CREATED':
      description = `建立卡片「${ctx.card_title}」。`;
      if (ctx.card_path) details.push(`路徑：\`${ctx.card_path}\``);
      if (ctx.card_type) details.push(`類型：${ctx.card_type}`);
      if (ctx.domains?.length) details.push(`領域：${ctx.domains.join('/')}`);
      break;

    case 'CARD_UPDATED':
      description = `更新卡片「${ctx.card_title}」。`;
      if (ctx.card_path) details.push(`路徑：\`${ctx.card_path}\``);
      if (ctx.updated_fields?.length) details.push(`更新欄位：${ctx.updated_fields.join('、')}`);
      break;

    case 'CARD_DELETED':
      description = `刪除卡片「${ctx.card_title}」。`;
      if (ctx.card_path) details.push(`路徑：\`${ctx.card_path}\``);
      break;

    case 'LINK_CREATED':
      description = `建立連結：「${ctx.source_title}」⇒「${ctx.target_title}」`;
      if (ctx.relation) details.push(`關係：${ctx.relation}`);
      if (ctx.note) details.push(`說明：${ctx.note}`);
      break;

    case 'LINK_REMOVED':
      description = `移除連結：「${ctx.source_title}」～「${ctx.target_title}」`;
      if (ctx.relation) details.push(`關係：${ctx.relation}`);
      break;

    case 'PROJECT_CREATED':
      description = `建立專案「${ctx.project_title}」。`;
      if (ctx.project_id) details.push(`ID：${ctx.project_id}`);
      if (ctx.deadline) details.push(`截止日：${ctx.deadline}`);
      break;

    case 'PROJECT_PAUSED':
      description = `暫停專案「${ctx.project_title}」。`;
      break;

    case 'PROJECT_RESUMED':
      description = `恢復專案「${ctx.project_title}」。`;
      break;

    case 'PROJECT_COMPLETED':
      description = `完成專案「${ctx.project_title}」。`;
      if (ctx.reflection) details.push(`反思：${ctx.reflection}`);
      break;

    case 'PROJECT_ARCHIVED':
      description = `歸檔專案「${ctx.project_title}」。`;
      break;

    case 'PROJECT_LOG_ADDED':
      description = `為專案「${ctx.project_title}」新增進度紀錄。`;
      if (ctx.log_text) details.push(`紀錄：${ctx.log_text}`);
      break;

    case 'CARD_LINKED_TO_PROJECT':
      description = `連結卡片「${ctx.card_title}」至專案「${ctx.project_title}」。`;
      break;

    case 'CARD_UNLINKED_FROM_PROJECT':
      description = `取消卡片「${ctx.card_title}」與專案「${ctx.project_title}」的連結。`;
      break;

    case 'MOC_CREATED':
      description = `建立 MOC「${ctx.moc_title}」。`;
      if (ctx.domain) details.push(`領域：${ctx.domain}`);
      if (ctx.card_count != null) details.push(`卡片數：${ctx.card_count}`);
      break;

    case 'MOC_UPDATED':
      description = `更新 MOC「${ctx.moc_title}」。`;
      if (ctx.card_count != null) details.push(`卡片數：${ctx.card_count}`);
      break;

    case 'MOC_SPLIT':
      description = `拆分 MOC「${ctx.moc_title}」。`;
      if (ctx.sub_mocs?.length) details.push(`子 MOC：${ctx.sub_mocs.join('、')}`);
      break;

    case 'MOC_DELETED':
      description = `刪除 MOC「${ctx.moc_title}」。`;
      if (ctx.domain) details.push(`領域：${ctx.domain}`);
      break;

    case 'INDEX_REBUILT':
      description = '重建 vault-index.json。';
      if (ctx.total_cards != null) details.push(`總卡片數：${ctx.total_cards}`);
      if (ctx.total_links != null) details.push(`總連結數：${ctx.total_links}`);
      break;

    default:
      description = `操作完成：${event_type}`;
      const ctxStr = JSON.stringify(ctx);
      if (ctxStr !== '{}') details.push(`上下文：${ctxStr}`);
  }

  const detailBlock = details.length ? '\n' + details.map(d => `- ${d}`).join('\n') : '';
  return `## ${ts}\n\n**${event_type}**\n\n${description}${detailBlock}\n`;
}

/**
 * Ensure changelog.md index page contains a link to the given month file (newest-first).
 */
function ensureIndexLink(indexPath, monthKey, monthFile) {
  const link = `- [[${monthFile.replace('.md', '')}|${monthKey}]]`;

  if (existsSync(indexPath)) {
    const content = readFileSync(indexPath, 'utf8');
    if (content.includes(monthFile.replace('.md', ''))) return; // already present

    // Prepend after the first heading line
    const lines = content.split('\n');
    const headingIdx = lines.findIndex(l => l.startsWith('#'));
    if (headingIdx >= 0) {
      lines.splice(headingIdx + 1, 0, '', link);
      writeFileSync(indexPath, lines.join('\n'), 'utf8');
    } else {
      writeFileSync(indexPath, `# Changelog\n\n${link}\n` + content, 'utf8');
    }
  } else {
    writeFileSync(indexPath, `# Changelog\n\n${link}\n`, 'utf8');
  }
}

/**
 * Write a changelog entry for the given event.
 * @returns {string} status — 'updated' or 'created'
 */
export async function writeChangelog({ event, vaultRoot }) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`;
  const monthFile = `changelog-${monthKey}.md`;
  const monthPath = join(vaultRoot, 'System', monthFile);
  const indexPath = join(vaultRoot, 'System', 'changelog.md');

  const entry = buildEntry(event) + '\n';

  let status = 'updated';
  if (!existsSync(monthPath)) {
    writeFileSync(monthPath, `# Changelog ${monthKey}\n\n${entry}`, 'utf8');
    status = 'created';
  } else {
    appendFileSync(monthPath, entry, 'utf8');
  }

  ensureIndexLink(indexPath, monthKey, monthFile);
  return status;
}
