"use client";
 
import React from "react";
import { Box, Text } from "../ink.js";
import chalk from "chalk";
 
const PHASES = ["QUESTIONNAIRE", "PLANNER", "EXECUTE", "DEBUG", "SHIP"];
 
interface TuiPhaseBarProps {
  currentPhase: string;
}
 
export default function TuiPhaseBar({ currentPhase }: TuiPhaseBarProps) {
  const phaseIdx = PHASES.findIndex(p => p.toLowerCase() === currentPhase.toLowerCase());
  if (phaseIdx === -1) return null;
 
  const progress = (phaseIdx + 1) / PHASES.length;
  const filledBlocks = Math.round(progress * 10);
  const emptyBlocks = 10 - filledBlocks;
 
  return (
    <Box flexDirection="row" alignItems="center" gap={2}>
      <Text>
        {chalk.green("█".repeat(filledBlocks))}
        {chalk.dim("░".repeat(emptyBlocks))}
      </Text>
      <Text>
        {` ${PHASES[phaseIdx]} (${phaseIdx + 1}/5)`}
      </Text>
    </Box>
  );
}
