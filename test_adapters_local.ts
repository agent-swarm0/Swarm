import { runAnthropicAdapter } from './src/api/anthropic';
import { runGeminiAdapter } from './src/api/gemini';
import { loadAllAgents, getAgent } from './src/api/agentLoader';
import { runMultiAgentDispatch } from './src/api/dispatch';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Self-contained .env parser to auto-load keys
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    }
  } catch (e) {
    console.error('Failed to load local .env file:', e);
  }
}

async function main() {
  console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════');
  console.log('\x1b[36m%s\x1b[0m', '   SWARM ADAPTERS LIVE TESTING SUITE    ');
  console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════\n');

  // Load and cache all agent definitions dynamically from agents/
  console.log('\x1b[35m%s\x1b[0m', '⚙ Loading Swarm agent directory...');
  loadAllAgents();
  
  const testAgentSlug = 'product-behavioral-nudge-engine';
  const agent = getAgent(testAgentSlug);
  
  console.log('\x1b[32m%s\x1b[0m', `\n🧠 Active Agent: ${agent.emoji} ${agent.name}`);
  console.log('\x1b[90m%s\x1b[0m', `📝 Description: ${agent.description}`);
  console.log('\x1b[90m%s\x1b[0m', `📏 Prompt length: ${agent.systemPrompt.length} chars\n`);

  const goal = 'Write a 3-sentence behavioral nudge recommendation to motivate a user who has 12 overdue tasks.';
  const systemPrompt = agent.systemPrompt;

  const rawAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const rawGeminiKey = process.env.GEMINI_API_KEY;

  // Validate if keys are real or placeholders (Anthropic starts with sk-, Gemini starts with AIzaSy or AQ.)
  const anthropicKey = rawAnthropicKey && rawAnthropicKey.trim().startsWith('sk-') ? rawAnthropicKey.trim() : undefined;
  const geminiKey = rawGeminiKey && (rawGeminiKey.trim().startsWith('AIzaSy') || rawGeminiKey.trim().startsWith('AQ.')) ? rawGeminiKey.trim() : undefined;

  if (rawAnthropicKey && !anthropicKey) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ Note: ANTHROPIC_API_KEY in .env is a placeholder or invalid format. Skipping live Anthropic calls.');
  }
  if (rawGeminiKey && !geminiKey) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ Note: GEMINI_API_KEY in .env is a placeholder or invalid format. Skipping live Gemini calls.');
  }

  // 1. Single Agent Anthropic Testing
  if (anthropicKey) {
    console.log('\x1b[32m%s\x1b[0m', '▶ Running Anthropic (Claude-3-5-Sonnet) Adapter:');
    try {
      await runAnthropicAdapter({
        goal,
        agentName: agent.name,
        systemPrompt,
        apiKey: anthropicKey,
        onToken: (token) => {
          process.stdout.write(token);
        },
      });
      console.log('\n\x1b[32m%s\x1b[0m', '✔ Anthropic Adapter Stream Complete.\n');
    } catch (err: any) {
      console.error('\x1b[31m%s\x1b[0m', `❌ Anthropic Error: ${err.message}\n`);
    }
  } else {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ Skipped Anthropic: ANTHROPIC_API_KEY not set.');
  }

  // 2. Single Agent Gemini Testing
  if (geminiKey) {
    console.log('\x1b[34m%s\x1b[0m', '▶ Running Gemini (Gemini-1.5-Pro) Adapter:');
    try {
      await runGeminiAdapter({
        goal,
        agentName: agent.name,
        systemPrompt,
        apiKey: geminiKey,
        onToken: (token) => {
          process.stdout.write(token);
        },
      });
      console.log('\n\x1b[34m%s\x1b[0m', '✔ Gemini Adapter Stream Complete.\n');
    } catch (err: any) {
      console.error('\x1b[31m%s\x1b[0m', `❌ Gemini Error: ${err.message}\n`);
    }
  } else {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ Skipped Gemini: GEMINI_API_KEY not set.');
  }

  // 3. Multi-Agent Parallel Dispatch Testing!
  console.log('\n\x1b[35m%s\x1b[0m', '⚡ PHASE 2: Parallel Multi-Agent Orchestration');
  const swarmGoal = 'Write a comprehensive security audit spec for a peer-to-peer payment gateway';
  console.log('\x1b[90m%s\x1b[0m', `Goal: "${swarmGoal}"`);
  
  try {
    const dispatchResult = await runMultiAgentDispatch(
      swarmGoal,
      {
        apiKeyAnthropic: anthropicKey,
        apiKeyGemini: geminiKey,
        onAgentStart: (slug) => {
          console.log('\x1b[36m%s\x1b[0m', `🚀 [Agent Spawned] ${slug.toUpperCase()} has started work...`);
        },
        onAgentToken: (slug, token) => {
          // In a real terminal, we could use separate lanes, but for now we badge them
          process.stdout.write(`\x1b[90m[${slug}]\x1b[0m ${token}`);
        },
        onAgentComplete: (slug, output) => {
          console.log('\n\x1b[32m%s\x1b[0m', `✔ [Agent Completed] ${slug.toUpperCase()} has finished! (${output.length} chars generated)`);
        }
      }
    );

    console.log('\n\x1b[35m%s\x1b[0m', '✨ PHASE 3: Lead Synthesizer Summary');
    console.log('\x1b[37m%s\x1b[0m', dispatchResult.finalSummary);

    // Save the final compiled result to a beautiful markdown file on disk
    const outputPath = 'swarm_output.md';
    writeFileSync(outputPath, dispatchResult.finalSummary, 'utf8');
    console.log('\n\x1b[32m%s\x1b[0m', `💾 Success! Final synthesis has been written to: ${outputPath}\n`);
  } catch (err: any) {
    console.error('\x1b[31m%s\x1b[0m', `❌ Dispatcher Error: ${err.message}\n`);
  }

  console.log('\n\x1b[36m%s\x1b[0m', '════════════════════════════════════════');
}

main().catch(console.error);
