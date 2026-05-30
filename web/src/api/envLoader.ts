import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface EnvKeys {
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

export function loadEnvKeys(): EnvKeys {
  const keys: EnvKeys = {};
  
  // Try loading from process.env first (in case Next.js loads it automatically)
  if (process.env.GEMINI_API_KEY) {
    keys.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    keys.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  }

  // Fallback to manual parsing of the parent .env file
  const envPath = join(process.cwd(), '../.env');
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          
          // Remove surrounding quotes if present
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          } else if (val.startsWith("'") && val.endsWith("'")) {
            val = val.substring(1, val.length - 1);
          }
          
          if (key === 'GEMINI_API_KEY') {
            keys.GEMINI_API_KEY = val;
          } else if (key === 'ANTHROPIC_API_KEY') {
            keys.ANTHROPIC_API_KEY = val;
          }
        }
      }
    } catch (err) {
      console.error('[EnvLoader] Error reading parent .env file:', err);
    }
  }

  // Ensure keys aren't placeholders
  if (keys.ANTHROPIC_API_KEY === 'your-claude-key') {
    keys.ANTHROPIC_API_KEY = undefined;
  }
  if (keys.GEMINI_API_KEY === 'your-gemini-key') {
    keys.GEMINI_API_KEY = undefined;
  }

  return keys;
}
