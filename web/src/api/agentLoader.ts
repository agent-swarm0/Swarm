import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';

export interface AgentDefinition {
  slug: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
  systemPrompt: string; // The parsed markdown instructions
}

// In-memory cache for all agents
const agentsCache = new Map<string, AgentDefinition>();

// Helper function to recursively find all files in a directory
function getFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...getFilesRecursive(filePath));
    } else if (extname(file) === '.md') {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Loads and parses all agent definitions from the agents/ directory
 * and caches them in memory.
 */
export function loadAllAgents(agentsDir: string = join(process.cwd(), 'agents')): void {
  agentsCache.clear();
  
  if (!existsSync(agentsDir)) {
    console.warn(`[AgentLoader] Warning: Agents directory not found at: ${agentsDir}`);
    return;
  }

  const agentFiles = getFilesRecursive(agentsDir);
  
  for (const filePath of agentFiles) {
    try {
      const fileContent = readFileSync(filePath, 'utf8');
      const slug = basename(filePath, '.md');

      // Parse YAML-like frontmatter
      const frontmatterMatch = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      let metadata: Record<string, string> = {};
      let systemPrompt = fileContent;

      if (frontmatterMatch) {
        const rawYaml = frontmatterMatch[1];
        systemPrompt = fileContent.replace(frontmatterMatch[0], '').trim();

        // Simple manual YAML parser for key-value strings
        for (const line of rawYaml.split(/\r?\n/)) {
          const colonIdx = line.indexOf(':');
          if (colonIdx !== -1) {
            const key = line.substring(0, colonIdx).trim();
            let val = line.substring(colonIdx + 1).trim();
            // Strip surrounding quotes
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            metadata[key] = val;
          }
        }
      }

      const agentDef: AgentDefinition = {
        slug,
        name: metadata.name || slug.replace(/-/g, ' '),
        description: metadata.description || '',
        color: metadata.color || '#4895EF',
        emoji: metadata.emoji || '🤖',
        vibe: metadata.vibe || '',
        systemPrompt,
      };

      agentsCache.set(slug, agentDef);
    } catch (err: any) {
      console.error(`[AgentLoader] Error loading agent from ${filePath}:`, err.message);
    }
  }

  console.log(`[AgentLoader] Successfully loaded and cached ${agentsCache.size} agent definitions.`);
}

/**
 * Get an agent definition by slug.
 * Fallback to a generic agent description if not found.
 */
export function getAgent(slug: string): AgentDefinition {
  const cached = agentsCache.get(slug);
  if (cached) return cached;

  // Generic fallback if the requested agent doesn't exist
  return {
    slug,
    name: slug.replace(/-/g, ' '),
    description: 'Generic AI Agent inside the Swarm network.',
    color: '#4895EF',
    emoji: '🤖',
    vibe: 'Helpful and efficient agent.',
    systemPrompt: `You are ${slug.replace(/-/g, ' ')}, a specialized AI agent in the Swarm network.
Your mission is to perform tasks, solve problems, and collaborate with other agents effectively.
Be highly accurate, follow developer instructions, and use tools when required.`,
  };
}

/**
 * Returns a list of all loaded agents (useful for the dashboard agent catalog).
 */
export function getAllAgentsList(): Omit<AgentDefinition, 'systemPrompt'>[] {
  return Array.from(agentsCache.values()).map(({ slug, name, description, color, emoji, vibe }) => ({
    slug,
    name,
    description,
    color,
    emoji,
    vibe,
  }));
}
