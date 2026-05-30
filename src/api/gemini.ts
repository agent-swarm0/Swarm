import { BaseAdapter } from './baseAdapter.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiAdapter extends BaseAdapter {
    async run(goal: string, agent: string, apiKey: string): Promise<AsyncIterable<string>> {
        console.log(`[Gemini] Running goal: ${goal} as ${agent}`);
        
        async function* generate() {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ 
                    model: 'gemini-1.5-pro',
                    systemInstruction: `You are ${agent}.`
                });
                const result = await model.generateContentStream(goal);
                
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) yield text;
                }
            } catch (e: any) {
                yield `Gemini Error: ${e.message}`;
            }
        }
        
        return generate();
    }
}
