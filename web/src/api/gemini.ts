import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiAdapterOptions {
  goal: string;
  agentName: string;
  systemPrompt: string;
  apiKey: string;
  onToken: (token: string) => void;
  /** Override the model fallback order. Defaults to flash-first (fast). */
  modelOrder?: string[];
}

/**
 * Gemini provider adapter for Agent Swarm.
 * Calls Gemini-1.5-Pro to stream response tokens.
 */
export async function runGeminiAdapter(options: GeminiAdapterOptions): Promise<void> {
  const { goal, agentName, systemPrompt, apiKey, onToken } = options;

  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please check your configuration.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelOrder = options.modelOrder ?? ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];
    let responseStream;
    let successfulModel = '';

    for (const modelName of modelOrder) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt || 'You are a helpful AI agent inside the Swarm network.',
        });
        responseStream = await model.generateContentStream(goal);
        successfulModel = modelName;
        break; // Successfully got the stream!
      } catch (e: any) {
        const errStr = (e?.message || String(e)).toLowerCase();
        const isMissing = errStr.includes('404') || errStr.includes('not found') || errStr.includes('support');
        // Also fall through to the next model on rate-limit / quota / overload errors,
        // so e.g. a quota-limited pro model gracefully drops to flash.
        const isThrottled = errStr.includes('429') || errStr.includes('quota') || errStr.includes('rate') || errStr.includes('exhaust') || errStr.includes('overload');
        if (isMissing || isThrottled) {
          console.warn(`[GeminiAdapter] Model ${modelName} unavailable (${isThrottled ? 'throttled' : 'missing'}). Trying next fallback...`);
          continue;
        }
        throw e; // Reraise fatal auth/network errors immediately
      }
    }

    if (!responseStream || !successfulModel) {
      throw new Error('All configured Gemini model endpoints returned 404 Not Found.');
    }

    if (successfulModel !== 'gemini-2.5-flash') {
      console.log(`\x1b[32m[GeminiAdapter] Active model selected: ${successfulModel}\x1b[0m`);
    }

    for await (const chunk of responseStream.stream) {
      try {
        const text = chunk.text();
        if (text) {
          onToken(text);
        }
      } catch (e) {
        // Handle potential safety block exceptions on chunk.text()
        const candidate = chunk.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          onToken('\n\n[Warning: Gemini blocked output due to safety settings]');
          break;
        }
        throw e;
      }
    }
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    throw new Error(`Gemini Adapter Error: ${errorMsg}`);
  }
}
