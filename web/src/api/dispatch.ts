import { runAnthropicAdapter } from './anthropic';
import { runGeminiAdapter } from './gemini';
import { runDeepSeekAdapter } from './deepseek';
import { getAgent, getAllAgentsList } from './agentLoader';
import { swarmMemoryStore } from './memory';
import { executeAgentWithRecovery } from './errors';
import { selectSkillsForAgent, buildSkillPrompt } from './skills';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { PlanResult, PlannedAgent } from '@/types/orchestration';

function normalizeOutputPath(inputPath: string): string {
  const normalized = inputPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^(\.\/)+/, '')
    .replace(/^project-output\//, '')
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join('/');

  return normalized || 'index.html';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createFailurePreview(goal: string, reason: string, agentOutputs: Record<string, string>): string {
  const rows = Object.entries(agentOutputs)
    .map(([slug, output]) => `
      <section class="agent">
        <h2>${escapeHtml(slug.replace(/-/g, ' '))}</h2>
        <pre>${escapeHtml(output || 'No output was returned.')}</pre>
      </section>
    `)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Swarm run diagnostics</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#0b0f14;color:#e6edf3;font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.5}
    main{max-width:980px;margin:0 auto;padding:48px 20px}.badge{display:inline-flex;border:1px solid #7f1d1d;color:#fecaca;background:#2a1013;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
    h1{font-size:clamp(32px,6vw,64px);line-height:1.02;margin:18px 0 16px;letter-spacing:0}.lead{max-width:720px;color:#aab6c5;font-size:18px}
    .panel,.agent{border:1px solid #243041;background:#111821;border-radius:12px;padding:18px;margin-top:18px}.panel strong{color:#fff}
    h2{margin:0 0 10px;text-transform:capitalize;font-size:18px}pre{white-space:pre-wrap;overflow:auto;margin:0;color:#cbd5e1;font-size:13px}
  </style>
</head>
<body>
  <main>
    <span class="badge">Preview fallback</span>
    <h1>The swarm did not produce a previewable build.</h1>
    <p class="lead">The dashboard is working, but the lead builder failed or returned no write_file block. The diagnostic output below shows why files were not generated.</p>
    <div class="panel"><strong>Goal:</strong><br>${escapeHtml(goal)}</div>
    <div class="panel"><strong>Reason:</strong><br>${escapeHtml(reason)}</div>
    ${rows || '<div class="panel">No agent output was captured.</div>'}
  </main>
</body>
</html>`;
}

export function extractAndWriteFiles(slug: string, output: string, onFileWritten?: (slug: string, path: string) => void): string[] {
  const regex = /<write_file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/write_file>/g;
  let match;
  const writtenPaths: string[] = [];
  
  const baseDir = join(process.cwd(), '../project-output');
  
  while ((match = regex.exec(output)) !== null) {
    const relativePath = normalizeOutputPath(match[1]);
    const fileContent = match[2].trim();
    
    try {
      const fullPath = join(baseDir, relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, fileContent, 'utf8');
      console.log(`[FileExtractor] Successfully wrote file: ${fullPath}`);
      writtenPaths.push(relativePath);
      if (onFileWritten) {
        onFileWritten(slug, relativePath);
      }
    } catch (err: any) {
      console.error(`[FileExtractor] Failed to write file ${relativePath}:`, err.message);
    }
  }

  return writtenPaths;
}


/** Replace <write_file> blocks with a concise marker so the report stays readable. */
export function stripWriteFiles(output: string): string {
  return output
    .replace(/<write_file\s+path=["']([^"']+)["']\s*>[\s\S]*?<\/write_file>/g, (_m, p) => `\n\`✓ wrote ${p}\`\n`)
    .trim();
}

export interface DispatchOptions {
  apiKeyAnthropic?: string;
  apiKeyGemini?: string;
  apiKeyDeepSeek?: string;
  sessionId?: string; // Optional session ID for memory context sharing
  onPlan?: (plan: PlanResult) => void;
  onFileWritten?: (slug: string, path: string) => void;
  onAgentStart: (slug: string) => void;
  onAgentToken: (slug: string, token: string) => void;
  onAgentComplete: (slug: string, output: string) => void;
  onAgentError?: (slug: string, output: string) => void;
}

export interface DispatchResult {
  plannedAgents: string[];
  results: Record<string, string>;
  finalSummary: string;
}

/**
 * Heuristic plan used when no API key is present or LLM planning fails.
 * Keeps local/offline testing working and gives each agent a readable task line.
 */
function heuristicPlan(goal: string, agentSlugs: string[]): PlanResult {
  const lowerGoal = goal.toLowerCase();
  const pick = (slugs: string[]) => slugs.filter(s => agentSlugs.includes(s));
  const label = (slug: string) => slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  let slugs: string[];
  let reasoning: string;
  if (lowerGoal.includes('code') || lowerGoal.includes('dev') || lowerGoal.includes('build') || lowerGoal.includes('program')) {
    slugs = pick(['tech-lead', 'backend-dev', 'frontend-dev']);
    reasoning = 'Goal looks like a build task, so dispatching engineering specialists in parallel to architect, implement back end, and implement front end.';
  } else if (lowerGoal.includes('market') || lowerGoal.includes('sales') || lowerGoal.includes('ad') || lowerGoal.includes('social')) {
    slugs = pick(['marketing-growth-hacker', 'marketing-social-media-strategist', 'sales-deal-strategist']);
    reasoning = 'Goal is go-to-market focused, so dispatching growth, social, and sales strategists in parallel.';
  } else if (lowerGoal.includes('test') || lowerGoal.includes('check') || lowerGoal.includes('bug') || lowerGoal.includes('error')) {
    slugs = pick(['testing-reality-checker', 'gsd-debugger', 'engineering-code-reviewer']);
    reasoning = 'Goal is about quality, so dispatching reality-checker, debugger, and code reviewer in parallel.';
  } else {
    slugs = pick(['project-manager', 'tech-lead']);
    reasoning = 'No strong signal in the goal, so dispatching a project manager and tech lead to scope and lead the work.';
  }

  // Treat every goal as a full build: top up to a full-stack roster of 6 specialists.
  const TARGET = 6;
  for (const s of agentSlugs) {
    if (slugs.length >= TARGET) break;
    if (!slugs.includes(s)) slugs.push(s);
  }
  slugs = slugs.slice(0, TARGET);

  return { reasoning, agents: slugs.map(slug => ({ slug, task: label(slug) })) };
}

/**
 * Wave 1: The Planner Agent.
 * Analyzes the user's goal, explains its reasoning, and selects the most relevant
 * specialized agents (with a one-line task each) to dispatch in parallel.
 */
export async function planAgentsForGoal(
  goal: string,
  options: { apiKeyAnthropic?: string; apiKeyGemini?: string; apiKeyDeepSeek?: string }
): Promise<PlanResult> {
  const availableAgents = getAllAgentsList();
  const agentSlugs = availableAgents.map(a => a.slug);

  const systemInstruction = `You are the Swarm Orchestrator Planner.
ALWAYS treat the user's goal as a complete, production-grade FULL-STACK product build, never a simple one-off.
Select 6 to 8 specialized agents to dispatch IN PARALLEL, covering the full delivery surface: product strategy / planning, software architecture, backend / data, frontend / implementation, UI / visual design, UX / interaction, content / copywriting, and QA / review. Pick the closest-matching available slug for each angle.
Return ONLY a valid JSON object (no markdown, no extra text) of this shape:
{
  "reasoning": "1-3 sentences explaining how you decomposed the goal and why you chose these agents.",
  "agents": [
    { "slug": "exact-agent-slug", "task": "One concise line describing what this agent will do for THIS goal." }
  ]
}
Use only slugs from this list:
${JSON.stringify(agentSlugs, null, 2)}`;

  const queryPrompt = `Analyze this user goal and produce the plan: "${goal}"`;

  const runPlanner = async (
    adapter: typeof runGeminiAdapter,
    apiKey: string,
  ): Promise<PlanResult | null> => {
    let resultText = '';
    await adapter({ goal: queryPrompt, agentName: 'orchestrator-planner', systemPrompt: systemInstruction, apiKey, onToken: (t) => { resultText += t; } });
    const cleaned = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const rawAgents = Array.isArray(parsed?.agents) ? parsed.agents : [];
    const agents: PlannedAgent[] = rawAgents
      .filter((a: any) => a && agentSlugs.includes(a.slug))
      .map((a: any) => ({ slug: a.slug, task: typeof a.task === 'string' && a.task.trim() ? a.task.trim() : a.slug.replace(/-/g, ' ') }));
    if (agents.length === 0) return null;
    return { reasoning: typeof parsed?.reasoning === 'string' ? parsed.reasoning : '', agents };
  };

  try {
    if (options.apiKeyGemini) {
      const plan = await runPlanner(runGeminiAdapter, options.apiKeyGemini);
      if (plan) return plan;
    } else if (options.apiKeyDeepSeek) {
      const plan = await runPlanner(runDeepSeekAdapter, options.apiKeyDeepSeek);
      if (plan) return plan;
    } else if (options.apiKeyAnthropic) {
      const plan = await runPlanner(runAnthropicAdapter, options.apiKeyAnthropic);
      if (plan) return plan;
    }
  } catch (e) {
    console.warn('[Dispatcher] LLM Planning failed, falling back to heuristics:', e);
  }

  // Fallback Heuristics (Allows local testing without keys!)
  console.log('[Dispatcher] Using heuristics to select agents...');
  return heuristicPlan(goal, agentSlugs);
}

/**
 * Helper to execute tasks in parallel with a concurrency cap (default: 5)
 */
async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 5
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (let i = 0; i < tasks.length; i++) {
    const p = tasks[i]().then(res => {
      results[i] = res;
    });
    executing.add(p);
    p.finally(() => executing.delete(p));

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(Array.from(executing));
  return results;
}

/**
 * Wave 2: Parallel Agent Dispatch.
 * Dispatches the selected agents in parallel (capped at a concurrency of 5),
 * streams all output, and merges their outputs.
 */
export async function runMultiAgentDispatch(
  goal: string,
  options: DispatchOptions
): Promise<DispatchResult> {
  const sessId = options.sessionId || `session-${Date.now()}`;
  console.log(`[Dispatcher] Initializing memory session: ${sessId}`);

  // Wave 1: Planning
  console.log('[Dispatcher] Planning execution waves...');
  const plan = await planAgentsForGoal(goal, {
    apiKeyAnthropic: options.apiKeyAnthropic,
    apiKeyGemini: options.apiKeyGemini,
    apiKeyDeepSeek: options.apiKeyDeepSeek,
  });

  // Every agent runs with at least one skill; attach them before dispatch.
  plan.agents = plan.agents.map(a => ({
    ...a,
    skills: a.skills && a.skills.length ? a.skills : selectSkillsForAgent(a.slug, goal),
  }));

  if (options.onPlan) {
    options.onPlan(plan);
  }

  const plannedAgents = plan.agents.map(a => a.slug);
  console.log(`[Dispatcher] Selected agents for dispatch: [${plannedAgents.join(', ')}]`);
  const agentOutputs: Record<string, string> = {};

  // Wave 2: Construct Tasks (one per planned agent; these run in parallel)
  const tasks = plan.agents.map(({ slug, task, skills }) => {
    return async () => {
      options.onAgentStart(slug);
      let outputText = '';
      const agentDef = getAgent(slug);

      // No agent runs without a skill (injected into the prompt, not shown in the stream).
      const agentSkills = skills && skills.length ? skills : selectSkillsForAgent(slug, goal);

      // Inject current persistent session memory into agent system instructions!
      let systemPrompt = swarmMemoryStore.injectMemoryIntoPrompt(agentDef.systemPrompt, sessId);

      // Inject the active skills' guidance so the agent actually applies them.
      systemPrompt += buildSkillPrompt(agentSkills);

      // Specialists ADVISE in parallel; they do NOT write files. The Lead Builder implements.
      systemPrompt += `\n\n--- YOUR ROLE IN THE SWARM ---
You are one specialist in a parallel full-stack product swarm. ALWAYS treat the user's goal as a complete, production-grade product build (full stack: architecture, backend, frontend, UI/UX, content, QA) — never a trivial one-off.
Deliver SHARP, CONCRETE, decisive guidance for YOUR specialty only, as 4 to 7 tight bullet points. Be specific to THIS exact goal: name the real sections, features, data models, tech choices, user flows, copy directions, and concrete visual decisions (fonts, palette, layout) where relevant.
Do NOT write code, HTML, CSS, or <write_file> blocks. The Lead Builder turns your guidance into the actual product, so make your guidance directly implementable.
Be concise and fast. Never use em dashes (the Unicode U+2014 character); use commas or colons instead.`;

      try {
        // Run with comprehensive retry-recovery boundaries!
        await executeAgentWithRecovery(
          slug,
          async () => {
            const adapterOptions = {
              goal: `Collaborate to solve this user goal: "${goal}".\n\nYour specific assignment for this run: ${task}\n\nProvide your specific perspective and deliverables as ${agentDef.name}.`,
              agentName: agentDef.name,
              systemPrompt,
              onToken: (token: string) => {
                outputText += token;
                options.onAgentToken(slug, token);
              },
            };

            // Determine which LLM provider to call (Gemini → DeepSeek → Anthropic)
            if (options.apiKeyGemini) {
              await runGeminiAdapter({
                ...adapterOptions,
                apiKey: options.apiKeyGemini,
              });
            } else if (options.apiKeyDeepSeek) {
              await runDeepSeekAdapter({
                ...adapterOptions,
                apiKey: options.apiKeyDeepSeek,
              });
            } else if (options.apiKeyAnthropic) {
              await runAnthropicAdapter({
                ...adapterOptions,
                apiKey: options.apiKeyAnthropic,
              });
            } else {
              // If no keys, simulate streaming for testing/TUI visual demo
              await new Promise<void>((resolve) => {
                const mockResponse = `[Mock Stream Output for ${agentDef.name}]: I have reviewed your request for "${goal}". As a specialized ${agentDef.name}, I recommend organizing time-boxes, standardizing documentation structures, and running parallel smoke test suites. All modules are clear!`;
                let index = 0;
                const interval = setInterval(() => {
                  if (index < mockResponse.length) {
                    const chunk = mockResponse.slice(index, index + 4);
                    options.onAgentToken(slug, chunk);
                    outputText += chunk;
                    index += 4;
                  } else {
                    clearInterval(interval);
                    resolve();
                  }
                }, 30);
              });
            }
            return outputText;
          },
          {
            onRetry: (slug, attempt, errorMsg) => {
              options.onAgentToken(slug, `\n⚠️ [Retry Attempt ${attempt}/${3}] due to: ${errorMsg}\n`);
            },
            onFailure: (slug, errorDetails) => {
              options.onAgentError?.(slug, `[Agent Failed - ${errorDetails.category}]: ${errorDetails.message}`);
            }
          }
        );

        options.onAgentComplete(slug, outputText);
        agentOutputs[slug] = outputText;

        // Record into session memory using the cheap heuristic path only.
        // (Calling the LLM here would double the request count and trigger
        // "too many parallel requests" rate limits during the parallel wave.)
        await swarmMemoryStore.updateMemory(sessId, slug, outputText, {});

      } catch (err: any) {
        // Record permanent failure but do not crash the other running agents!
        console.error(`[Dispatcher] Agent ${slug} permanently failed:`, err.message);
        agentOutputs[slug] = `[Permanent Failure - ${err.details?.category || 'ERROR'}]: ${err.details?.message || err.message}`;
        options.onAgentError?.(slug, agentOutputs[slug]);
      }
    };
  });

  // Run the specialists in parallel, capped to spread requests under rate limits.
  // Advisors are short and fast, so a full 6-8 agent roster still finishes quickly.
  await runWithConcurrencyLimit(tasks, 4);

  // Final wave: the Lead Builder turns the specialists' insights into the real,
  // styled, production application — guaranteeing a previewable index.html.
  console.log('[Dispatcher] Lead Builder assembling the application...');
  let builderOutput = '';

  const builderSystem = `You are the Swarm Lead Builder, a world-class senior product designer and front-end engineer. The specialists have advised; you ship the actual product. Treat the goal as a complete, production-grade build.

OUTPUT FORMAT:
- Write EVERY file using <write_file path="filename.ext">FULL FILE CONTENTS</write_file> blocks. No commentary between files.
- You MUST write a single self-contained "index.html" at the root that renders with zero build step. Load Tailwind via <script src="https://cdn.tailwindcss.com"></script> and fonts via Google Fonts <link>. All JS inline. It must work opened directly in a browser.
- After the files, add a short "## Build summary" (2 to 3 sentences).

DESIGN DOCTRINE (this is what wins the hackathon, obey it):
- Before coding, commit to ONE specific, opinionated aesthetic that fits THIS project (e.g. editorial, brutalist, warm boutique, technical/utilitarian, retro-futurist). The design must look like it could ONLY belong to this project, never a swappable template.
- Ask yourself: "does this look like a default AI prompt generated it?" If yes, start over. Avoid the generic AI look at all costs.
- Typography and spacing carry the design. Pair an expressive DISPLAY font with a clean body font from Google Fonts (e.g. Fraunces, Clash Display, Space Grotesk, Sora, Instrument Serif, Bricolage Grotesque). NEVER use Inter, Roboto, Arial, or system-ui as the display font.
- Use a deliberate, characterful color palette. BANNED: purple/blue gradients on white or dark, glassmorphism cards, floating blob/orb background shapes, scrolling marquees, 3-column big-number stat grids, "trusted by" logo rows, fake placeholder stats, and section labels like "WHAT WE DO" above a uniform card grid.
- Layout must feel considered: asymmetry, offset grids, deliberate negative space. NOT a centered hero of headline + subtext + one button and nothing else.
- One well-timed entrance animation beats ten micro-interactions. Add tasteful scroll-reveal and refined hover states (CSS/IntersectionObserver).
- Real, specific copy tailored to the goal. No lorem ipsum, no "insert content here".
- Build MANY rich, full-width sections so it feels like a complete shippable product: distinctive nav, a striking hero, then the sections this product actually needs (features, how-it-works, showcase/gallery, pricing, FAQ, strong footer, etc.). Make it long and substantial.
- Fully responsive (mobile-first). Accessible. Fast.
- Never use em dashes (the Unicode U+2014 character); use commas or colons instead.

Make it so good that a judge says "wow, a swarm of AI agents built THIS?".`;

  const builderGoal = `User goal: "${goal}"

Specialist insights to build from:
${JSON.stringify(agentOutputs, null, 2)}

Now write all the production files (always including a fully styled index.html), then the build summary.`;

  const onBuilderToken = (t: string) => { builderOutput += t; options.onAgentToken('lead-synthesizer', t); };

  options.onAgentStart('lead-synthesizer');
  try {
    if (options.apiKeyGemini) {
      // Builder uses the most capable model for quality; falls back to flash if throttled.
      await runGeminiAdapter({ goal: builderGoal, agentName: 'lead-builder', systemPrompt: builderSystem, apiKey: options.apiKeyGemini, onToken: onBuilderToken, modelOrder: ['gemini-2.5-pro', 'gemini-2.5-flash'] });
    } else if (options.apiKeyDeepSeek) {
      await runDeepSeekAdapter({ goal: builderGoal, agentName: 'lead-builder', systemPrompt: builderSystem, apiKey: options.apiKeyDeepSeek, onToken: onBuilderToken });
    } else if (options.apiKeyAnthropic) {
      await runAnthropicAdapter({ goal: builderGoal, agentName: 'lead-builder', systemPrompt: builderSystem, apiKey: options.apiKeyAnthropic, onToken: onBuilderToken });
    } else {
      // Demo mode: ship a small but fully styled page so the preview works offline.
      const mock = `<write_file path="index.html"><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Swarm demo</title><style>
*{margin:0;box-sizing:border-box}body{font-family:ui-sans-serif,system-ui;background:#0d1117;color:#e6edf3;display:grid;place-items:center;min-height:100vh;text-align:center;padding:2rem}
.card{max-width:520px}h1{font-size:clamp(32px,6vw,56px);line-height:1.05;background:linear-gradient(90deg,#12a85a,#8ee29f);-webkit-background-clip:text;background-clip:text;color:transparent}
p{color:#9aa7b2;margin:18px 0 28px;font-size:18px}a{display:inline-block;background:#12a85a;color:#fff;text-decoration:none;padding:12px 26px;border-radius:10px;font-weight:600}
</style></head><body><div class="card"><h1>Built by the swarm</h1><p>This is a demo-mode preview. Add an API key to have the swarm build your real goal.</p><a href="#">Get started</a></div></body></html>
</write_file>

## Build summary
Demo mode assembled a small, fully styled landing page so the live preview renders end to end.`;
      await new Promise<void>((resolve) => {
        let i = 0;
        const iv = setInterval(() => {
          if (i < mock.length) { onBuilderToken(mock.slice(i, i + 8)); i += 8; }
          else { clearInterval(iv); resolve(); }
        }, 16);
      });
    }
  } catch (e: any) {
    console.error('[Dispatcher] Lead Builder failed:', e?.message || e);
    const reason = e?.message || 'Build step failed; specialist insights are preserved above.';
    options.onAgentError?.('lead-synthesizer', reason);
    builderOutput = builderOutput || createFailurePreview(goal, reason, agentOutputs);
  }

  // Write whatever files the builder produced (this guarantees the index.html preview).
  let writtenBuilderFiles = extractAndWriteFiles('lead-builder', builderOutput, options.onFileWritten);
  if (writtenBuilderFiles.length === 0) {
    const fallbackHtml = createFailurePreview(
      goal,
      'The lead builder returned no <write_file> blocks, so the dashboard generated this diagnostic preview.',
      agentOutputs,
    );
    builderOutput = `<write_file path="index.html">${fallbackHtml}</write_file>

## Build summary
The swarm completed without producing preview files. A diagnostic preview was generated instead.`;
    writtenBuilderFiles = extractAndWriteFiles('lead-builder', builderOutput, options.onFileWritten);
  }

  // The report should show a clean summary, not raw file contents.
  const finalSummary = stripWriteFiles(builderOutput) || 'Build complete.';

  options.onAgentComplete('lead-synthesizer', finalSummary);

  return {
    plannedAgents,
    results: agentOutputs,
    finalSummary,
  };
}
