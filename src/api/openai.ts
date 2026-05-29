import { BaseAdapter } from './baseAdapter.js';

export class OpenAIAdapter extends BaseAdapter {
    async run(goal: string, agent: string, apiKey: string): Promise<AsyncIterable<string>> {
        console.log(`[OpenAI] Running goal: ${goal} as ${agent}`);
        
        async function* generate() {
            yield "OpenAI: Starting to process your goal... ";
            yield "I am analyzing the requirements... ";
            yield `As the ${agent}, I will now implement the solution. `;
            yield "Done!";
        }
        
        return generate();
    }
}
