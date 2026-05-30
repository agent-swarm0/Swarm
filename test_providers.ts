import { run } from './src/api/router';

async function test() {
  const testCases = [
    { provider: 'openai', goal: 'Hello OpenAI' },
    { provider: 'anthropic', goal: 'Hello Anthropic' },
    { provider: 'gemini', goal: 'Hello Gemini' },
    { provider: 'groq', goal: 'Hello Groq' },
  ];

  for (const tc of testCases) {
    try {
      console.log(`Testing ${tc.provider}...`);
      const res = await run({
        goal: tc.goal,
        provider: tc.provider,
        apiKey: 'sk-test-key',
        mode: 'API',
      });
      if (res.stream) {
        console.log(`✅ ${tc.provider} returned a stream.`);
      } else {
        console.log(`✅ ${tc.provider} returned output: ${res.output}`);
      }
    } catch (e: any) {
      console.error(`❌ ${tc.provider} failed: ${e.message}`);
    }
  }
}

test();
