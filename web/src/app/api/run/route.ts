import { NextRequest } from 'next/server';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { runMultiAgentDispatch } from '@/api/dispatch';
import { loadAllAgents } from '@/api/agentLoader';
import { loadEnvKeys } from '@/api/envLoader';
import { saveProjectToHistory } from '@/api/history';

export async function POST(req: NextRequest) {
  try {
    const { goal, clarifications, sessionId, geminiKey, anthropicKey, deepseekKey } = await req.json();

    if (!goal) {
      return new Response(JSON.stringify({ error: 'Goal is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build the combined goal with clarifications context if present
    let combinedGoal = goal;
    if (clarifications && Array.isArray(clarifications) && clarifications.length > 0) {
      combinedGoal += '\n\nAdditional Clarifications from User:\n';
      for (const item of clarifications) {
        if (item.question && item.answer) {
          combinedGoal += `- Q: ${item.question}\n  A: ${item.answer}\n`;
        }
      }
    }

    const activeSessionId = sessionId || `session-${Date.now()}`;
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendEvent = async (event: string, data: any) => {
      try {
        const payload = `data: ${JSON.stringify({ event, data })}\n\n`;
        await writer.write(encoder.encode(payload));
      } catch (err) {
        console.warn('[SSE Route] Failed to send SSE event:', err);
      }
    };

    // Run async so Next.js can return the stream immediately
    (async () => {
      try {
        // Clear project-output directory ONLY if starting a brand new project session
        if (!sessionId) {
          const baseDir = join(process.cwd(), '../project-output');
          if (existsSync(baseDir)) {
            rmSync(baseDir, { recursive: true, force: true });
          }
          mkdirSync(baseDir, { recursive: true });
        }

        // Load agents from parent directory
        loadAllAgents(join(process.cwd(), '../agents'));

        // Load environmental variables, allow client-supplied keys as override
        const envKeys = loadEnvKeys();
        const resolvedGeminiKey = geminiKey || envKeys.GEMINI_API_KEY;
        const resolvedAnthropicKey = anthropicKey || envKeys.ANTHROPIC_API_KEY;
        const resolvedDeepSeekKey = deepseekKey || envKeys.DEEPSEEK_API_KEY;

        const hasKey = Boolean(resolvedGeminiKey || resolvedAnthropicKey || resolvedDeepSeekKey);
        if (!hasKey) {
          // No keys: run in offline demo mode. The dispatcher streams mock agent
          // output and the planner uses heuristics, so the full flow is viewable.
          await sendEvent('init', { message: 'Demo mode (no API key): simulating a parallel swarm run…' });
        } else {
          await sendEvent('init', { message: 'Analyzing goal and planning execution waves...' });
        }

        const writtenFiles: { slug: string; path: string }[] = [];

        const result = await runMultiAgentDispatch(combinedGoal, {
          sessionId: activeSessionId,
          apiKeyAnthropic: resolvedAnthropicKey,
          apiKeyGemini: resolvedGeminiKey,
          apiKeyDeepSeek: resolvedDeepSeekKey,
          onPlan: (plan) => {
            sendEvent('plan', { reasoning: plan.reasoning, agents: plan.agents });
          },
          onFileWritten: (slug, path) => {
            writtenFiles.push({ slug, path });
            sendEvent('file-written', { slug, path });
          },
          onAgentStart: (slug) => {
            sendEvent('agent-start', { slug });
          },
          onAgentToken: (slug, token) => {
            sendEvent('agent-token', { slug, token });
          },
          onAgentComplete: (slug, output) => {
            sendEvent('agent-complete', { slug, output });
          },
          onAgentError: (slug, output) => {
            sendEvent('agent-error', { slug, output });
          },
        });

        // Archive to historical project vault
        saveProjectToHistory(activeSessionId, combinedGoal, writtenFiles.map(f => f.path));

        await sendEvent('complete', { 
          finalSummary: result.finalSummary,
          sessionId: activeSessionId
        });
      } catch (error: any) {
        console.error('[SSE Route] Orchestration error:', error);
        await sendEvent('error', { message: error.message || 'An unknown error occurred during dispatch.' });
      } finally {
        try {
          await writer.close();
        } catch (err) {
          console.warn('[SSE Route] Failed to close SSE stream writer:', err);
        }
      }
    })();

    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
