/**
 * Agent Metadata Routes
 * Provides access to agent dossiers and system prompts.
 */
import { Router } from "express";
import { listAgents, getAgentSystemPrompt } from "../services/agentCatalog.js";
import { logger } from "../utils/logger.js";
 
const router = Router();
 
// Get agent metadata
router.get("/:slug", (req, res) => {
  const { slug } = req.params;
  const agent = listAgents().find((a) => a.slug === slug);
  
  if (!agent) {
    return res.status(404).json({ error: `Agent ${slug} not found` });
  }
  
  res.json(agent);
});
 
// Get agent system prompt
router.get("/:slug/prompt", (req, res) => {
  const { slug } = req.params;
  const prompt = getAgentSystemPrompt(slug);
  
  if (!prompt) {
    return res.status(404).json({ error: `Prompt for agent ${slug} not found` });
  }
  
  res.json({ prompt });
});
 
export default router;
