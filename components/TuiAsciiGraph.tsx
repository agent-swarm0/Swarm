"use client";
 
import React from "react";
import { Box, Text } from "../ink.js";
import chalk from "chalk";
 
interface Agent {
  id: string;
  status: string;
}
 
interface TuiAsciiGraphProps {
  agents: Agent[];
}
 
export default function TuiAsciiGraph({ agents }: TuiAsciiGraphProps) {
  if (agents.length === 0) return null;
 
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return chalk.green.bold;
      case "thinking": return chalk.cyan;
      case "queued": return chalk.yellow;
      case "done": return chalk.dim;
      case "error": return chalk.red;
      default: return chalk.white;
    }
  };
 
  // Very simple ASCII representation of the graph
  // Swarm Node -> Agents
  return (
    <Box flexDirection="column" alignItems="center" padding={2}>
      <Text bold color="green">SWARM</Text>
      <Text>│</Text>
      <Text>├───────┬───────┬───────┐</Text>
      <Box flexDirection="row" justifyContent="center" gap={4}>
        {agents.map((agent) => (
          <Box key={agent.id} flexDirection="column" alignItems="center">
            <Text>│</Text>
            <Text>{getStatusColor(agent.status)(agent.id)}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
