/**
 * project-meta.mjs — Shared project metadata reader for Home and Dashboard.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseYamlFrontmatter } from './resolve-config.mjs';

/**
 * Read a project goal.md to get title and deadline.
 * @param {string} projectsDir - Absolute path to PARA/Projects/
 * @param {string} projectId - Project directory name
 * @returns {{ title: string, deadline: string|null }}
 */
export function readProjectMeta(projectsDir, projectId) {
  const goalPath = join(projectsDir, projectId, 'goal.md');
  if (!existsSync(goalPath)) return { title: projectId, deadline: null };
  const content = readFileSync(goalPath, 'utf8');
  const fm = parseYamlFrontmatter(content);
  return {
    title: (fm.title || projectId).replace(/^["']|["']$/g, ''),
    deadline: fm.deadline || null,
  };
}
