import { GoogleGenerativeAI } from '@google/generative-ai';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Self-contained .env parser to auto-load keys
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    }
  } catch (e) {
    console.error('Failed to load local .env file:', e);
  }
}

async function listSupportedModels() {
  console.log('════════════════════════════════════════');
  console.log('   GEMINI API KEY MODEL DIAGNOSTIC TOOL  ');
  console.log('════════════════════════════════════════\n');

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('❌ Error: GEMINI_API_KEY is not set in your .env file.');
    return;
  }

  console.log(`Using key: ${geminiKey.substring(0, 8)}...${geminiKey.substring(geminiKey.length - 4)}`);
  
  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // In @google/generative-ai, listModels is not directly exposed as a top level function on GoogleGenerativeAI instance.
    // Instead we can list models by doing a simple fetch request or checking standard models.
    // Let's test standard endpoints and print the status!
    const modelsToTest = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.5-flash-lite',
    ];

    console.log('\nTesting common model endpoints...\n');

    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // Make a tiny generation request to check if authorized and enabled
        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        });
        
        console.log(`✅ Model \x1b[32m"${modelName}"\x1b[0m is ACTIVE and fully supported!`);
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        
        if (errMsg.includes('404') || errMsg.includes('not found')) {
          console.log(`❌ Model \x1b[31m"${modelName}"\x1b[0m: NOT FOUND (404) on this account.`);
        } else if (errMsg.includes('API key not valid') || errMsg.includes('400')) {
          console.log(`❌ Model \x1b[31m"${modelName}"\x1b[0m: API Key is INVALID.`);
        } else if (errMsg.includes('403') || errMsg.includes('permission') || errMsg.includes('denied')) {
          console.log(`❌ Model \x1b[31m"${modelName}"\x1b[0m: PERMISSION DENIED (403). Is the Generative Language API enabled?`);
        } else {
          console.log(`⚠️ Model \x1b[33m"${modelName}"\x1b[0m returned error: ${errMsg.substring(0, 120)}...`);
        }
      }
    }
  } catch (err: any) {
    console.error('Fatal initialization error:', err.message);
  }
  
  console.log('\n════════════════════════════════════════');
}

listSupportedModels();
