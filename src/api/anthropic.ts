import Anthropic from '@anthropic-ai/sdk';

export interface AdapterOptions {
  goal: string;
  agentName: string;
  systemPrompt: string;
  apiKey: string;
  onToken: (token: string) => void;
}

/**
 * Anthropic provider adapter for Agent Swarm.
 * Calls Claude-3-5-Sonnet to stream response tokens.
 */
export async function runAnthropicAdapter(options: AdapterOptions): Promise<void> {
  const { goal, agentName, systemPrompt, apiKey, onToken } = options;

  if (!apiKey) {
    throw new Error('Anthropic API key is missing. Please check your configuration.');
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const stream = await anthropic.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt || 'You are a helpful AI agent inside the Swarm network.',
      messages: [
        {
          role: 'user',
          content: goal,
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onToken(event.delta.text);
      }
    }
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    throw new Error(`Anthropic Adapter Error: ${errorMsg}`);
  }
}
