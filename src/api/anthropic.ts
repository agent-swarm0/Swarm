import { BaseAdapter } from './baseAdapter.js';

export class AnthropicAdapter extends BaseAdapter {
    async run(goal: string, agent: string, apiKey: string): Promise<AsyncIterable<string>> {
        console.log(`[Anthropic] Running goal: ${goal} as ${agent}`);
        
        async function* generate() {
            yield "Anthropic: Processing your request... ";
            yield "Designing the architecture... ";
            yield `Executing as ${agent}... `;
            yield "Completed successfully!";
        }
        
        return generate();
    }
}
