import { BaseAdapter } from './baseAdapter.js';

export class GeminiAdapter extends BaseAdapter {
    async run(goal: string, agent: string, apiKey: string): Promise<AsyncIterable<string>> {
        console.log(`[Gemini] Running goal: ${goal} as ${agent}`);
        
        async function* generate() {
            yield "Gemini: Thinking... ";
            yield "Generating code... ";
            yield `Applying ${agent}'s expertise... `;
            yield "Task finished!";
        }
        
        return generate();
    }
}
