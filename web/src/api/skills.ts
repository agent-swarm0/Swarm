import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Loads SKILL.md guidance from the repo's top-level skills/ library and selects
 * which skills each dispatched agent should apply. Principle: no agent runs
 * without at least one skill.
 */

const bodyCache = new Map<string, string>();

function skillsRoot(): string {
  // API routes run with cwd = web/, the skills library sits at the repo root.
  return join(process.cwd(), '../skills');
}

/** Read a skill's body (frontmatter stripped), truncated to keep prompts lean and fast. */
export function loadSkillBody(name: string, maxChars = 1500): string {
  if (bodyCache.has(name)) return bodyCache.get(name)!;
  let body = '';
  try {
    const p = join(skillsRoot(), name, 'SKILL.md');
    if (existsSync(p)) {
      let txt = readFileSync(p, 'utf8');
      txt = txt.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
      body = txt.length > maxChars ? txt.slice(0, maxChars) + '\n…(skill truncated)' : txt;
    }
  } catch (err: any) {
    console.warn(`[Skills] Failed to load skill "${name}":`, err.message);
  }
  bodyCache.set(name, body);
  return body;
}

/**
 * Pick the most relevant skills for an agent given its slug and the goal.
 * Always returns at least one skill. Capped to keep the prompt focused.
 */
export function selectSkillsForAgent(slug: string, goal: string): string[] {
  const hay = `${slug} ${goal}`.toLowerCase();
  const skills: string[] = [];
  const add = (...names: string[]) => names.forEach((n) => { if (!skills.includes(n)) skills.push(n); });

  const isFrontend = /front|ui|ux|web|design|page|landing|css|react|component|dashboard|site|styl|brand/.test(hay);
  const isBackend = /back|api|server|database|\bdb\b|auth|endpoint|schema|infra/.test(hay);
  const isTest = /test|qa|review|debug|bug|verify|check|audit/.test(hay);
  const isContent = /content|copy|writ|article|market|blog|seo/.test(hay);

  if (isFrontend) add('design-system', 'frontend-patterns');
  if (isBackend) add('backend-patterns', 'api-design');
  if (isTest) add('browser-qa');
  if (isContent) add('article-writing');

  // Default: most swarm output is a web artifact, so design-system guarantees
  // styled, cohesive results. coding-standards covers everything else.
  if (skills.length === 0) add('design-system', 'coding-standards');

  return skills.slice(0, 2);
}

/** Build the prompt block that injects the selected skills' guidance. */
export function buildSkillPrompt(skillNames: string[]): string {
  const blocks = skillNames
    .map((n) => {
      const body = loadSkillBody(n);
      return body ? `### SKILL: ${n}\n${body}` : '';
    })
    .filter(Boolean);

  if (blocks.length === 0) return '';

  return `\n\n--- ACTIVE SKILLS (mandatory, you MUST apply these) ---
You are running with the following skills loaded. Follow their guidance exactly.
${blocks.join('\n\n')}
--- END ACTIVE SKILLS ---\n`;
}
