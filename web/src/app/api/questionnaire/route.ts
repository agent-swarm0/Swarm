import { NextResponse } from 'next/server';
import { runGeminiAdapter } from '@/api/gemini';
import { runAnthropicAdapter } from '@/api/anthropic';
import { loadEnvKeys } from '@/api/envLoader';

export async function POST(req: Request) {
  try {
    const { goal } = await req.json();
    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    const keys = loadEnvKeys();
    if (!keys.GEMINI_API_KEY && !keys.ANTHROPIC_API_KEY) {
      // Fallback questions for local/demo mode if no keys are found
      return NextResponse.json({
        questions: [
          "What is the exact name of your construction company?",
          "Do you have a preferred color theme or brand aesthetic (e.g. Modern Minimalist, Heavy Industrial, Eco-Friendly)?",
          "What primary sections do you want on the page (e.g. Hero, Our Services, Recent Projects Portfolio, Contact Form)?"
        ]
      });
    }

    const systemPrompt = `You are the Swarm Intake Receptionist.
Analyze the user's build goal and generate exactly 3 highly relevant, friendly clarifying questions that will help the specialized agents build exactly what the user wants.
Do not ask generic questions. Ask specific questions about their business branding, preference in tech stack, or specific features they want.
Return ONLY a valid JSON object containing an array of 3 string questions under the key 'questions'. Do not add markdown formatting or extra text.
Format:
{
  "questions": [
    "Question 1?",
    "Question 2?",
    "Question 3?"
  ]
}`;

    let resultText = '';
    const goalPrompt = `Analyze this build goal: "${goal}" and generate 3 clarifying questions.`;

    if (keys.GEMINI_API_KEY) {
      await runGeminiAdapter({
        goal: goalPrompt,
        agentName: 'reception-questionnaire',
        systemPrompt,
        apiKey: keys.GEMINI_API_KEY,
        onToken: (t) => { resultText += t; }
      });
    } else if (keys.ANTHROPIC_API_KEY) {
      await runAnthropicAdapter({
        goal: goalPrompt,
        agentName: 'reception-questionnaire',
        systemPrompt,
        apiKey: keys.ANTHROPIC_API_KEY,
        onToken: (t) => { resultText += t; }
      });
    }

    // Parse JSON
    try {
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.questions)) {
        return NextResponse.json({ questions: parsed.questions });
      }
    } catch (e) {
      console.warn('[Questionnaire API] Failed to parse LLM JSON, parsing fallback matches:', e);
    }

    // Heuristics/regex fallback parser if JSON is slightly off
    const lines = resultText.split('\n').map(l => l.trim()).filter(l => l.startsWith('"') || l.startsWith('-') || l.match(/^\d/));
    if (lines.length >= 3) {
      const questions = lines.slice(0, 3).map(l => l.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9? ]+$/, '').trim());
      return NextResponse.json({ questions });
    }

    // Default fallback questions
    return NextResponse.json({
      questions: [
        "What is the exact name of your construction company?",
        "Do you have a preferred color theme or brand aesthetic (e.g. Modern Minimalist, Heavy Industrial, Eco-Friendly)?",
        "What primary sections do you want on the page (e.g. Hero, Our Services, Recent Projects Portfolio, Contact Form)?"
      ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
