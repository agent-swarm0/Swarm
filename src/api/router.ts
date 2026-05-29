import { OpenAIAdapter } from './openai.js';
import { AnthropicAdapter } from './anthropic.js';
import { GeminiAdapter } from './gemini.js';
import { GroqAdapter } from './groq.js';
import pLimit from 'p-limit';
import fs from 'fs';
import path from 'path';

export interface RunOptions {
    goal: string;
    provider: string;
    apiKey: string;
    agentSlug?: string;
    mode: 'CLI' | 'API';
}

const ADAPTERS: Record<string, any> = {
    openai: new OpenAIAdapter(),
    anthropic: new AnthropicAdapter(),
    gemini: new GeminiAdapter(),
    groq: new GroqAdapter(),
};

function getConcurrencyLimit(): number {
    try {
        const configPath = path.join(process.cwd(), 'swarm.config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.api_mode?.concurrency_cap || 5;
    } catch {
        return 5;
    }
}

const limit = pLimit(getConcurrencyLimit());

export async function run(options: RunOptions) {
    const { goal, provider, apiKey, mode, agentSlug } = options;

    if (mode === 'CLI') {
        console.log('Falling back to CLI orchestrator flow...');
        return {
            status: 'success',
            output: `CLI Mode: Running goal "${goal}" with agent ${agentSlug || 'default'}`,
        };
    }

    const adapter = ADAPTERS[provider.toLowerCase()];
    if (!adapter) {
        throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
        console.log(`API Mode: Dispatching to ${provider} adapter...`);
        
        // Wrap the adapter call in the concurrency limiter
        return await limit(async () => {
            const stream = await adapter.run(goal, agentSlug || 'swarm-assistant', apiKey);
            return {
                status: 'success',
                stream,
            };
        });
    } catch (error: any) {
        console.error(`Error in ${provider} adapter:`, error);
        throw error;
    }
}
