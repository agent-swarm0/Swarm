import { BaseAdapter } from './baseAdapter.js';

export class GroqAdapter extends BaseAdapter {
    async run(goal: string, agent: string, apiKey: string): Promise<AsyncIterable<string>> {
        console.log(`[Groq] Running goal: ${goal} as ${agent}`);
        
        async function* generate() {
            yield "Groq: Ultra-fast processing... ";
            yield "Parsing goal... ";
            yield `As ${agent}, I've completed the task. `;
            yield "Fast and done!";
        }
        
        return generate();
    }
}
