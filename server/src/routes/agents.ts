/**
 * GET /api/agents — agent catalog for the dashboard.
 *
 * Returns the full agent list (or one category via `?category=`), plus the set
 * of categories so the UI can build filters without a second request.
 */
import { Router } from "express";
import {
  listAgents,
  listAgentsByCategory,
  listCategories,
} from "../services/agentCatalog.js";

export const agentsRouter = Router();

agentsRouter.get("/api/agents", (req, res) => {
  const category = req.query.category;

  if (typeof category === "string" && category.trim()) {
    const agents = listAgentsByCategory(category);
    res.status(200).json({
      category: category.trim(),
      count: agents.length,
      agents,
    });
    return;
  }

  const agents = listAgents();
  res.status(200).json({
    count: agents.length,
    categories: listCategories(),
    agents,
  });
});
