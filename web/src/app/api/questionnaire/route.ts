import { NextResponse } from 'next/server';
import { runGeminiAdapter } from '@/api/gemini';
import { runAnthropicAdapter } from '@/api/anthropic';
import { runDeepSeekAdapter } from '@/api/deepseek';
import { loadEnvKeys } from '@/api/envLoader';
import type { Question, QuestionType } from '@/types/orchestration';

/**
 * Hardcoded structured fallback used when no API key is set (offline demo) or
 * when the LLM output can't be parsed. Includes real `previewHtml` so the
 * sandboxed-iframe option previews are demonstrable without any keys.
 */
function fallbackQuestions(): Question[] {
  return [
    {
      id: 'brand',
      type: 'text',
      prompt: "What's the exact name and one-line tagline for your project or brand?",
    },
    {
      id: 'aesthetic',
      type: 'single',
      prompt: 'Which visual aesthetic should the swarm commit to?',
      allowCustom: true,
      options: [
        {
          id: 'editorial',
          label: 'Editorial Minimal',
          description: 'Generous whitespace, serif headlines, restrained palette.',
          previewHtml: `<!doctype html><html><head><meta charset="utf-8"><style>
            *{margin:0;box-sizing:border-box}
            body{font-family:Georgia,'Times New Roman',serif;background:#faf9f6;color:#1a1a1a;padding:48px 56px}
            .kicker{font:600 13px/1 ui-sans-serif,system-ui;letter-spacing:.3em;text-transform:uppercase;color:#9a8f7a}
            h1{font-size:64px;line-height:1.02;margin:18px 0 20px;font-weight:500;letter-spacing:-.02em}
            p{font:400 19px/1.6 ui-sans-serif,system-ui;color:#555;max-width:460px}
            .rule{height:1px;background:#1a1a1a;width:88px;margin:34px 0}
          </style></head><body>
            <div class="kicker">Studio</div>
            <h1>Considered<br>by design.</h1>
            <div class="rule"></div>
            <p>Typography and space do the work. Nothing decorative that hasn't earned its place.</p>
          </body></html>`,
        },
        {
          id: 'industrial',
          label: 'Heavy Industrial',
          description: 'Bold, dark, utilitarian. Hard edges and high contrast.',
          previewHtml: `<!doctype html><html><head><meta charset="utf-8"><style>
            *{margin:0;box-sizing:border-box}
            body{font-family:'Arial Narrow',ui-sans-serif,sans-serif;background:#0c0d0e;color:#f5f5f5;padding:44px 48px}
            .tag{display:inline-block;border:2px solid #ff5a1f;color:#ff5a1f;font:800 12px/1 sans-serif;letter-spacing:.2em;padding:6px 10px;text-transform:uppercase}
            h1{font-size:70px;line-height:.92;margin:22px 0;font-weight:900;text-transform:uppercase;letter-spacing:-.01em}
            h1 em{color:#ff5a1f;font-style:normal}
            .bar{display:flex;gap:8px;margin-top:30px}
            .bar span{height:10px;flex:1;background:#222}
            .bar span:first-child{background:#ff5a1f}
          </style></head><body>
            <div class="tag">// Built Tough</div>
            <h1>Forged for<br><em>the field.</em></h1>
            <div class="bar"><span></span><span></span><span></span><span></span></div>
          </body></html>`,
        },
        {
          id: 'warm',
          label: 'Warm Boutique',
          description: 'Soft, friendly, rounded. Warm tones and approachable type.',
          previewHtml: `<!doctype html><html><head><meta charset="utf-8"><style>
            *{margin:0;box-sizing:border-box}
            body{font-family:ui-rounded,'Segoe UI',system-ui,sans-serif;background:#fff4ec;color:#3a2a22;padding:46px 52px}
            .pill{display:inline-block;background:#ffd9c2;color:#c0552a;font:700 13px/1 system-ui;padding:8px 16px;border-radius:999px}
            h1{font-size:58px;line-height:1.05;margin:20px 0 16px;font-weight:800;letter-spacing:-.02em}
            p{font-size:18px;line-height:1.6;color:#7a6258;max-width:430px}
            .dot{display:flex;gap:10px;margin-top:28px}
            .dot span{width:30px;height:30px;border-radius:50%}
            .dot span:nth-child(1){background:#ff8a5c}.dot span:nth-child(2){background:#ffc15c}.dot span:nth-child(3){background:#ff6f91}
          </style></head><body>
            <div class="pill">Hello there 👋</div>
            <h1>Made with<br>a little love.</h1>
            <p>Soft corners, warm color, and copy that actually sounds like a person.</p>
            <div class="dot"><span></span><span></span><span></span></div>
          </body></html>`,
        },
      ],
    },
    {
      id: 'layout',
      type: 'single',
      prompt: 'Which homepage layout structure fits best?',
      options: [
        {
          id: 'hero',
          label: 'Hero-led',
          description: 'Full-width statement hero, then sections below.',
          previewHtml: `<!doctype html><html><head><meta charset="utf-8"><style>
            *{margin:0;box-sizing:border-box}body{background:#101317;padding:24px;font-family:system-ui}
            .wire>div{background:#1d2430;border:1px solid #2c3542;border-radius:6px;margin-bottom:12px}
            .hero{height:150px;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:0 24px}
            .hero .l{height:14px;width:60%;background:#3a4759;border-radius:3px}.hero .l.s{width:38%;height:9px;background:#2c3542}
            .row{display:flex;gap:12px}.row>div{flex:1;height:70px;background:#1d2430;border:1px solid #2c3542;border-radius:6px}
          </style></head><body><div class="wire">
            <div class="hero"><div class="l"></div><div class="l s"></div></div>
            <div class="row"><div></div><div></div><div></div></div>
          </div></body></html>`,
        },
        {
          id: 'split',
          label: 'Split',
          description: 'Two-column hero: copy on one side, visual on the other.',
          previewHtml: `<!doctype html><html><head><meta charset="utf-8"><style>
            *{margin:0;box-sizing:border-box}body{background:#101317;padding:24px;font-family:system-ui}
            .split{display:flex;gap:14px;height:160px;margin-bottom:12px}
            .split .copy{flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px}
            .split .copy .l{height:13px;background:#3a4759;border-radius:3px}.split .copy .l.s{width:55%;height:9px;background:#2c3542}
            .split .img{flex:1;background:#243042;border:1px solid #2c3542;border-radius:8px}
            .bar{height:60px;background:#1d2430;border:1px solid #2c3542;border-radius:6px}
          </style></head><body>
            <div class="split"><div class="copy"><div class="l"></div><div class="l s"></div><div class="l s"></div></div><div class="img"></div></div>
            <div class="bar"></div>
          </body></html>`,
        },
        {
          id: 'stacked',
          label: 'Stacked sections',
          description: 'Sequential full-width bands, scroll-driven story.',
          previewHtml: `<!doctype html><html><head><meta charset="utf-8"><style>
            *{margin:0;box-sizing:border-box}body{background:#101317;padding:24px;font-family:system-ui}
            .band{height:46px;border:1px solid #2c3542;border-radius:6px;margin-bottom:12px;display:flex;align-items:center;padding:0 18px;gap:10px;background:#1d2430}
            .band .l{height:11px;width:40%;background:#3a4759;border-radius:3px}
            .band:nth-child(2){background:#243042}.band:nth-child(4){background:#243042}
          </style></head><body>
            <div class="band"><div class="l"></div></div>
            <div class="band"><div class="l"></div></div>
            <div class="band"><div class="l"></div></div>
            <div class="band"><div class="l"></div></div>
          </body></html>`,
        },
      ],
    },
  ];
}

const VALID_TYPES: QuestionType[] = ['single', 'multi', 'text'];

/** Validate + normalize an arbitrary parsed value into Question[] (or null if unusable). */
function normalizeQuestions(raw: unknown): Question[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Question[] = [];
  raw.forEach((q: any, i: number) => {
    if (!q || typeof q.prompt !== 'string') return;
    const type: QuestionType = VALID_TYPES.includes(q.type) ? q.type : (Array.isArray(q.options) ? 'single' : 'text');
    const question: Question = {
      id: typeof q.id === 'string' && q.id ? q.id : `q${i + 1}`,
      prompt: q.prompt,
      type,
      allowCustom: Boolean(q.allowCustom),
    };
    if (type !== 'text' && Array.isArray(q.options)) {
      const opts = q.options
        .filter((o: any) => o && typeof o.label === 'string')
        .map((o: any, j: number) => ({
          id: typeof o.id === 'string' && o.id ? o.id : `o${j + 1}`,
          label: o.label,
          description: typeof o.description === 'string' ? o.description : undefined,
          previewHtml: typeof o.previewHtml === 'string' ? o.previewHtml : undefined,
        }));
      if (opts.length === 0) return; // option question with no options is useless
      question.options = opts;
    }
    out.push(question);
  });
  return out.length > 0 ? out : null;
}

const SYSTEM_PROMPT = `You are the Swarm Intake Designer. Given the user's build goal, produce a SHORT
clarifying questionnaire that the specialist agents will use to build exactly what the user wants.

Return ONLY a valid JSON object (no markdown, no commentary) of this exact shape:
{
  "questions": [
    {
      "id": "kebab-id",
      "prompt": "A specific, friendly question?",
      "type": "single" | "multi" | "text",
      "allowCustom": true,
      "options": [
        { "id": "kebab-id", "label": "Short label", "description": "One sentence.", "previewHtml": "<!doctype html>..." }
      ]
    }
  ]
}

Rules:
- Produce 3 to 4 questions, ordered from most to least important.
- Make questions SPECIFIC to the user's goal (branding, aesthetic, layout, key features, tech). No generic filler.
- Use "type":"text" (omit options) for open facts like exact names/taglines.
- Use "type":"single" or "multi" with 3 concrete options for choices.
- "allowCustom": true on choice questions where the user might want their own answer.
- VISUAL PREVIEWS: For questions about aesthetic, color theme, layout, or typography, EACH option MUST
  include a "previewHtml": a small, COMPLETELY self-contained HTML document (inline <style> only) that
  visually demonstrates that option. NO <script>, NO external URLs/images/fonts, no network requests.
  Design it to look good rendered at roughly 1000x640 (it will be scaled into a thumbnail).
- For non-visual questions, omit "previewHtml".
- Keep each previewHtml under ~2KB. Output valid JSON only.`;

async function streamLLM(
  keys: { GEMINI_API_KEY?: string; DEEPSEEK_API_KEY?: string; ANTHROPIC_API_KEY?: string },
  goalPrompt: string,
): Promise<string> {
  let resultText = '';
  const opts = { goal: goalPrompt, agentName: 'reception-questionnaire', systemPrompt: SYSTEM_PROMPT, onToken: (t: string) => { resultText += t; } };
  if (keys.GEMINI_API_KEY) {
    await runGeminiAdapter({ ...opts, apiKey: keys.GEMINI_API_KEY });
  } else if (keys.DEEPSEEK_API_KEY) {
    await runDeepSeekAdapter({ ...opts, apiKey: keys.DEEPSEEK_API_KEY });
  } else if (keys.ANTHROPIC_API_KEY) {
    await runAnthropicAdapter({ ...opts, apiKey: keys.ANTHROPIC_API_KEY });
  }
  return resultText;
}

export async function POST(req: Request) {
  try {
    const { goal, geminiKey, anthropicKey, deepseekKey } = await req.json();
    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    const envKeys = loadEnvKeys();
    const keys = {
      GEMINI_API_KEY: geminiKey || envKeys.GEMINI_API_KEY,
      ANTHROPIC_API_KEY: anthropicKey || envKeys.ANTHROPIC_API_KEY,
      DEEPSEEK_API_KEY: deepseekKey || envKeys.DEEPSEEK_API_KEY,
    };

    // No keys → offline demo mode with real, previewable fallback questions.
    if (!keys.GEMINI_API_KEY && !keys.ANTHROPIC_API_KEY && !keys.DEEPSEEK_API_KEY) {
      return NextResponse.json({ questions: fallbackQuestions() });
    }

    const resultText = await streamLLM(
      keys,
      `Analyze this build goal and generate the clarifying questionnaire: "${goal}"`,
    );

    try {
      const cleaned = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const questions = normalizeQuestions(parsed?.questions);
      if (questions) {
        return NextResponse.json({ questions });
      }
    } catch (e) {
      console.warn('[Questionnaire API] Failed to parse LLM JSON, using fallback:', e);
    }

    // Couldn't get a usable structured result → safe structured fallback.
    return NextResponse.json({ questions: fallbackQuestions() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
