export interface DeepSeekAdapterOptions {
  goal: string;
  agentName: string;
  systemPrompt: string;
  apiKey: string;
  onToken: (token: string) => void;
}

export async function runDeepSeekAdapter(options: DeepSeekAdapterOptions): Promise<void> {
  const { goal, systemPrompt, apiKey, onToken } = options;

  if (!apiKey) {
    throw new Error('DeepSeek API key is missing. Please check your configuration.');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      stream: true,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful AI agent inside the Swarm network.',
        },
        { role: 'user', content: goal },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek Adapter Error: ${response.status} ${err}`);
  }

  if (!response.body) throw new Error('DeepSeek: no response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onToken(delta);
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}
