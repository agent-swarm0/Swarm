import { Router } from "express";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const runRouter = Router();

const VALID_PROVIDERS = ["openai", "anthropic", "gemini", "groq"];

runRouter.post("/run", (req, res) => {
  const { agent, task, provider } = req.body;

  if (!agent) return res.status(400).json({ error: "agent is required" });
  if (provider && !VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` });
  }

  const configPath = join(process.cwd(), "..", "swarm.config.json");
  if (!existsSync(configPath)) {
    return res.status(500).json({ error: "swarm.config.json not found" });
  }

  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const agents = config.agents as Record<string, { file: string; engine: string; source: string }>;

  if (!agents[agent]) {
    return res.status(404).json({ error: `Agent "${agent}" not found` });
  }

  const resolvedProvider = provider ?? agents[agent].engine ?? config.default_engine ?? "claude";

  res.json({
    agent,
    task: task ?? null,
    provider: resolvedProvider,
    file: agents[agent].file,
    status: "queued",
  });
});