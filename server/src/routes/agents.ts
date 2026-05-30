import { Router } from "express";
import { readFileSync } from "fs";
import { join } from "path";

export const agentsRouter = Router();

agentsRouter.get("/api/agents", (req, res) => {
  const configPath = join(process.cwd(), "..", "swarm.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const agents = config.agents;

  const grouped: Record<string, string[]> = {};
  for (const [name, info] of Object.entries(agents as Record<string, { source: string }>)) {
    const src = info.source ?? "other";
    if (!grouped[src]) grouped[src] = [];
    grouped[src].push(name);
  }

  res.json({
    total: Object.keys(agents).length,
    grouped,
    agents,
  });
});