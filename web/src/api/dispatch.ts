import { runAnthropicAdapter } from './anthropic';
import { runGeminiAdapter } from './gemini';
import { getAgent, getAllAgentsList } from './agentLoader';
import { swarmMemoryStore } from './memory';
import { executeAgentWithRecovery } from './errors';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

export function extractAndWriteFiles(slug: string, output: string, onFileWritten?: (slug: string, path: string) => void) {
  const regex = /<write_file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/write_file>/g;
  let match;
  
  const baseDir = join(process.cwd(), '../project-output');
  
  while ((match = regex.exec(output)) !== null) {
    const relativePath = match[1];
    const fileContent = match[2].trim();
    
    try {
      const fullPath = join(baseDir, relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, fileContent, 'utf8');
      console.log(`[FileExtractor] Successfully wrote file: ${fullPath}`);
      if (onFileWritten) {
        onFileWritten(slug, relativePath);
      }
    } catch (err: any) {
      console.error(`[FileExtractor] Failed to write file ${relativePath}:`, err.message);
    }
  }
}


export interface DispatchOptions {
  apiKeyAnthropic?: string;
  apiKeyGemini?: string;
  sessionId?: string; // Optional session ID for memory context sharing
  onPlan?: (agents: string[]) => void;
  onFileWritten?: (slug: string, path: string) => void;
  onAgentStart: (slug: string) => void;
  onAgentToken: (slug: string, token: string) => void;
  onAgentComplete: (slug: string, output: string) => void;
}

export interface DispatchResult {
  plannedAgents: string[];
  results: Record<string, string>;
  finalSummary: string;
}

/**
 * Wave 1: The Planner Agent.
 * Analyzes the user's goal and returns a list of specialized agent slugs
 * that should be dispatched in parallel to tackle the goal.
 */
export async function planAgentsForGoal(
  goal: string,
  options: { apiKeyAnthropic?: string; apiKeyGemini?: string }
): Promise<string[]> {
  const availableAgents = getAllAgentsList();
  const agentSlugs = availableAgents.map(a => a.slug);

  const systemInstruction = `You are the Swarm Orchestrator Planner.
Your job is to analyze the user's goal and select the most relevant, specialized agents from the list of available agents to solve this task in parallel.
Select between 2 to 4 agents.
Return ONLY a valid JSON string containing an array of agent slugs. Do not add markdown formatting or extra text.

Available Agent Slugs:
${JSON.stringify(agentSlugs, null, 2)}`;

  // If we have API keys, let's query the LLM to get an intelligent plan
  if (options.apiKeyGemini) {
    try {
      let resultText = '';
      await runGeminiAdapter({
        goal: `Analyze this user goal and select the best sub-agents: "${goal}"`,
        agentName: 'orchestrator-planner',
        systemPrompt: systemInstruction,
        apiKey: options.apiKeyGemini,
        onToken: (t) => { resultText += t; },
      });

      // Extract JSON array
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const slugs = JSON.parse(cleaned);
      if (Array.isArray(slugs)) {
        return slugs.filter(s => agentSlugs.includes(s));
      }
    } catch (e) {
      console.warn('[Dispatcher] LLM Planning failed, falling back to heuristics:', e);
    }
  } else if (options.apiKeyAnthropic) {
    try {
      let resultText = '';
      await runAnthropicAdapter({
        goal: `Analyze this user goal and select the best sub-agents: "${goal}"`,
        agentName: 'orchestrator-planner',
        systemPrompt: systemInstruction,
        apiKey: options.apiKeyAnthropic,
        onToken: (t) => { resultText += t; },
      });

      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const slugs = JSON.parse(cleaned);
      if (Array.isArray(slugs)) {
        return slugs.filter(s => agentSlugs.includes(s));
      }
    } catch (e) {
      console.warn('[Dispatcher] LLM Planning failed, falling back to heuristics:', e);
    }
  }

  // Fallback Heuristics (Allows local testing without keys!)
  console.log('[Dispatcher] Using heuristics to select agents...');
  const lowerGoal = goal.toLowerCase();
  
  if (lowerGoal.includes('code') || lowerGoal.includes('dev') || lowerGoal.includes('build') || lowerGoal.includes('program')) {
    return ['tech-lead', 'backend-dev', 'frontend-dev'].filter(s => agentSlugs.includes(s));
  }
  
  if (lowerGoal.includes('market') || lowerGoal.includes('sales') || lowerGoal.includes('ad') || lowerGoal.includes('social')) {
    return ['marketing-growth-hacker', 'marketing-social-media-strategist', 'sales-deal-strategist'].filter(s => agentSlugs.includes(s));
  }

  if (lowerGoal.includes('test') || lowerGoal.includes('check') || lowerGoal.includes('bug') || lowerGoal.includes('error')) {
    return ['testing-reality-checker', 'gsd-debugger', 'engineering-code-reviewer'].filter(s => agentSlugs.includes(s));
  }

  // Default fallback
  return ['project-manager', 'tech-lead'].filter(s => agentSlugs.includes(s));
}

/**
 * Helper to execute tasks in parallel with a concurrency cap (default: 5)
 */
async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 5
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const p = tasks[i]().then(res => {
      results[i] = res;
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
      // Remove completed promises from the active queue
      executing.splice(executing.findIndex(item => item === p), 1);
    }
  }
  await Promise.all(executing);
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
  const plannedAgents = await planAgentsForGoal(goal, {
    apiKeyAnthropic: options.apiKeyAnthropic,
    apiKeyGemini: options.apiKeyGemini,
  });

  if (options.onPlan) {
    options.onPlan(plannedAgents);
  }

  console.log(`[Dispatcher] Selected agents for dispatch: [${plannedAgents.join(', ')}]`);
  const agentOutputs: Record<string, string> = {};

  // Wave 2: Construct Tasks
  const tasks = plannedAgents.map(slug => {
    return async () => {
      options.onAgentStart(slug);
      let outputText = '';
      const agentDef = getAgent(slug);

      // Inject current persistent session memory into agent system instructions!
      let systemPrompt = swarmMemoryStore.injectMemoryIntoPrompt(agentDef.systemPrompt, sessId);

      // Append high-priority file-writing instructions for the specialized agents
      const fileWritingInstruction = `\n\n---
CRITICAL ACTION REQUIREMENT FOR PHYSICAL FILE GENERATION:
If this user request requires creating, generating, or modifying code, components, CSS styles, web layouts, HTML templates, configurations, or scripts (e.g. index.html, styles.css, app.tsx, etc.), you MUST write the COMPLETE file contents inside a <write_file path="filename.ext">...</write_file> tag block.
You can generate multiple distinct files across multiple blocks.

Example:
<write_file path="index.html">
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Landing Page</title>
</head>
<body>
  <h1>Welcome</h1>
</body>
</html>
</write_file>

MANDATORY PREVIEW REQUIREMENT FOR ALL FRONTEND/WEB/DAPP PROJECTS:
If you are generating a frontend web application (whether it uses React, TypeScript, Vite, Tailwind, or smart contracts), you MUST write a beautifully styled, fully interactive, standalone entry point file directly at "index.html" in the root output folder.
Even if you write advanced modular React components (e.g. src/App.tsx, src/components/Header.tsx) and Solidity smart contracts (e.g. src/CypherPulseNFT.sol), you MUST ALSO write a standalone visual compilation at "index.html" that mimics the DApp's target interface, themes, neon colors, and interactive simulated scripts (such as Connect Wallet MetaMask triggers, NFT quantity select, and glowing Mint success dialogs)!
This is critical because the browser visual preview panel runs off of "index.html". If you fail to write the "index.html" entry point, the user will not be able to preview your DApp! Always make sure to provide both the clean production-ready modular files and the working standalone index.html preview!

Always provide the fully realized, high-quality production code. Do not use comments like "insert remaining code here" or placeholders!`;
      systemPrompt += fileWritingInstruction;

      try {
        // Run with comprehensive retry-recovery boundaries!
        await executeAgentWithRecovery(
          slug,
          async () => {
            const adapterOptions = {
              goal: `Collaborate to solve this user goal: "${goal}". Provide your specific perspective as ${agentDef.name}.`,
              agentName: agentDef.name,
              systemPrompt,
              onToken: (token: string) => {
                outputText += token;
                options.onAgentToken(slug, token);
              },
            };

            // Determine which LLM provider to call (Gemini preferred, fallbacks to Anthropic)
            if (options.apiKeyGemini) {
              await runGeminiAdapter({
                ...adapterOptions,
                apiKey: options.apiKeyGemini,
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
              options.onAgentComplete(slug, `❌ [Agent Failed - ${errorDetails.category}]: ${errorDetails.message}`);
            }
          }
        );

        options.onAgentComplete(slug, outputText);
        agentOutputs[slug] = outputText;

        // Automatically extract and write any file blocks inside outputText to disk!
        extractAndWriteFiles(slug, outputText, options.onFileWritten);

        // Dynamically compress and record agent output into session memory!
        await swarmMemoryStore.updateMemory(sessId, slug, outputText, {
          apiKeyGemini: options.apiKeyGemini,
          apiKeyAnthropic: options.apiKeyAnthropic,
        });

      } catch (err: any) {
        // Record permanent failure but do not crash the other running agents!
        console.error(`[Dispatcher] Agent ${slug} permanently failed:`, err.message);
        agentOutputs[slug] = `[Permanent Failure - ${err.details?.category || 'ERROR'}]: ${err.details?.message || err.message}`;
      }
    };
  });

  // Run tasks in parallel, capped at a concurrency limit of 5!
  await runWithConcurrencyLimit(tasks, 5);

  // Generate Final Summary from all agent outputs and shared session memory
  console.log('[Dispatcher] Merging outputs and generating final synthesis...');
  let finalSummary = '';
  
  const currentMemory = swarmMemoryStore.getOrCreateSession(sessId);
  const synthesisGoal = `Synthesize these specialized agent insights and shared session memory into a cohesive, action-oriented final summary:

Specialized Outputs:
${JSON.stringify(agentOutputs, null, 2)}

Shared Session Memory Context:
${JSON.stringify(currentMemory.facts, null, 2)}`;

  const synthesisPrompt = 'You are the Swarm Lead Synthesizer. Merge multiple agent findings and persistent session context into a clear, unified execution summary.';

  options.onAgentStart('lead-synthesizer');
  if (options.apiKeyGemini) {
    try {
      await runGeminiAdapter({
        goal: synthesisGoal,
        agentName: 'lead-synthesizer',
        systemPrompt: synthesisPrompt,
        apiKey: options.apiKeyGemini,
        onToken: (t) => {
          finalSummary += t;
          options.onAgentToken('lead-synthesizer', t);
        },
      });
    } catch (e) {
      finalSummary = 'Synthesis failed, raw insights preserved.';
    }
  } else if (options.apiKeyAnthropic) {
    try {
      await runAnthropicAdapter({
        goal: synthesisGoal,
        agentName: 'lead-synthesizer',
        systemPrompt: synthesisPrompt,
        apiKey: options.apiKeyAnthropic,
        onToken: (t) => {
          finalSummary += t;
          options.onAgentToken('lead-synthesizer', t);
        },
      });
    } catch (e) {
      finalSummary = 'Synthesis failed, raw insights preserved.';
    }
  } else {
    // Simulate lead synthesizer stream
    await new Promise<void>((resolve) => {
      const mockResponse = `[Mock Final Summary]: Swarm has successfully executed parallel runs! Loaded ${plannedAgents.length} agents. Active memory session: ${sessId} with ${currentMemory.facts.length} facts saved on disk. Cohesion is achieved across all modules. Ready to build and deploy!`;
      let index = 0;
      const interval = setInterval(() => {
        if (index < mockResponse.length) {
          const chunk = mockResponse.slice(index, index + 4);
          options.onAgentToken('lead-synthesizer', chunk);
          finalSummary += chunk;
          index += 4;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, 30);
    });
  }

  options.onAgentComplete('lead-synthesizer', finalSummary);

  return {
    plannedAgents,
    results: agentOutputs,
    finalSummary,
  };
}
