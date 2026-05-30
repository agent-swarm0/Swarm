import { runAnthropicAdapter } from './anthropic';
import { runGeminiAdapter } from './gemini';
import { getAgent, getAllAgentsList } from './agentLoader';
import { swarmMemoryStore } from './memory';
import { executeAgentWithRecovery } from './errors';

export interface DispatchOptions {
  apiKeyAnthropic?: string;
  apiKeyGemini?: string;
  sessionId?: string; // Optional session ID for memory context sharing
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

  console.log(`[Dispatcher] Selected agents for dispatch: [${plannedAgents.join(', ')}]`);
  const agentOutputs: Record<string, string> = {};

  // Wave 2: Construct Tasks
  const tasks = plannedAgents.map(slug => {
    return async () => {
      options.onAgentStart(slug);
      let outputText = '';
      const agentDef = getAgent(slug);

      // Inject current persistent session memory into agent system instructions!
      const systemPrompt = swarmMemoryStore.injectMemoryIntoPrompt(agentDef.systemPrompt, sessId);

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

  if (options.apiKeyGemini) {
    try {
      await runGeminiAdapter({
        goal: synthesisGoal,
        agentName: 'lead-synthesizer',
        systemPrompt: synthesisPrompt,
        apiKey: options.apiKeyGemini,
        onToken: (t) => { finalSummary += t; },
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
        onToken: (t) => { finalSummary += t; },
      });
    } catch (e) {
      finalSummary = 'Synthesis failed, raw insights preserved.';
    }
  } else {
    finalSummary = `[Mock Final Summary]: Swarm has successfully executed parallel runs! Loaded ${plannedAgents.length} agents. Active memory session: ${sessId} with ${currentMemory.facts.length} facts saved on disk. Cohesion is achieved across all modules. Ready to build and deploy!`;
  }

  return {
    plannedAgents,
    results: agentOutputs,
    finalSummary,
  };
}
