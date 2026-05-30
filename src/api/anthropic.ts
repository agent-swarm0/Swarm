import { BaseAdapter } from './baseAdapter.js';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicAdapter extends BaseAdapter {
    async run(goal: string, agent: string, apiKey: string): Promise<AsyncIterable<string>> {
        console.log(`[Anthropic] Running goal: ${goal} as ${agent}`);
        
        async function* generate() {
            try {
                const anthropic = new Anthropic({ apiKey });
                const stream = await anthropic.messages.stream({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 4096,
                    system: `You are ${agent}.`,
                    messages: [{ role: 'user', content: goal }],
                });

                for await (const event of stream) {
                    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                        yield event.delta.text;
                    }
                }
            } catch (e: any) {
                yield `Anthropic Error: ${e.message}`;
            }
        }
        
        return generate();
    }
}
