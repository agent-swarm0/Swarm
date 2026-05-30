"use client";
 
import React from "react";
import { Box, Text } from "../ink.js";
import chalk from "chalk";
 
interface Agent {
  id: string;
  status: string;
  tokenCount?: number;
}
 
interface TuiStatusBarProps {
  agents: Agent[];
}
 
const STATUS_COLORS: Record<string, (text: string) => string> = {
  queued: chalk.yellow,
  thinking: chalk.cyan,
  active: chalk.green,
  done: chalk.dim,
  error: chalk.red.bold,
  idle: chalk.dim,
};
 
export default function TuiStatusBar({ agents }: TuiStatusBarProps) {
  if (agents.length === 0) return null;
 
  // Limit to top 8 active/relevant agents
  const displayAgents = agents
    .filter(a => a.status !== "idle")
    .slice(0, 8);
 
  if (displayAgents.length === 0) return null;
 
  return (
    <Box flexDirection="column" borderTop={true} borderColor="dim">
      {displayAgents.map((agent) => (
        <Box key={agent.id} flexDirection="row" justifyContent="space-between" width="100%">
          <Text>
            {`[${agent.id.padEnd(15, " ")}] `}
            {STATUS_COLORS[agent.status]?.(agent.status.toUpperCase()) || agent.status.toUpperCase()}
            {` ${agent.tokenCount ? `Tokens: ${agent.tokenCount}` : ""}`}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
