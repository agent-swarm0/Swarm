import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
process.loadEnvFile?.(resolve(__dirname, "..", ".env"));
const { streamLLM } = await import("../src/services/llm.js");

const system = `You are a senior frontend developer. Build complete, production-quality files.
When you produce code, write COMPLETE file contents inside <write_file path="index.html">...</write_file> blocks. Always write a standalone index.html. No placeholders.`;
const prompt = `Founder's goal: "Build a one-page site for a plant shop called Fern & Co". Build the complete index.html now.`;

const { text, provider } = await streamLLM({ system, prompt, maxOutputTokens: 3200, onToken: () => {} });
console.log("PROVIDER:", provider, "LEN:", text.length);
console.log("has <write_file:", text.includes("<write_file"));
console.log("has ```:", text.includes("```"));
console.log("has <!doctype/<html:", /<!doctype html|<html/i.test(text));
console.log("--- first 700 ---\n" + text.slice(0, 700));
process.exit(0);
