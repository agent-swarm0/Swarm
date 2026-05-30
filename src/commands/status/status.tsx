import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { useTuiOrchestrator } from '../../hooks/useTuiOrchestrator.js';
import type { LocalJSXCommandContext } from '../../commands.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { Dialog } from '../../components/design-system/Dialog.js';

function GodModeStatus({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const { agents, phase, orchestrator } = useTuiOrchestrator("ws://localhost:3000/ws/orchestrator");

  return (
    <Dialog title="GOD MODE: Swarm Status" onCancel={() => onDone()} color="success">
      <Box flexDirection="column" width="100%">
        <Box marginBottom={1} borderBottomDimColor borderStyle="single" width="100%">
          <Text bold>Current Phase: </Text>
          <Text color="suggestion">{phase.toUpperCase()}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text bold>Orchestrator Goal: </Text>
          <Text>{orchestrator.goal || "No active goal"}</Text>
          {orchestrator.isThinking && <Text color="suggestion"> [THINKING...]</Text>}
        </Box>

        <Box marginTop={1} marginBottom={1}>
          <Text bold underline>Agent Fleet</Text>
        </Box>

        {agents.length === 0 ? (
          <Text dimColor>No agents dispatched yet.</Text>
        ) : (
          <Box flexDirection="column">
            {agents.map(agent => (
              <Box key={agent.id} flexDirection="row" marginBottom={0.5}>
                <Text width={20} truncate>{agent.id}</Text>
                <Text width={15} dimColor>{agent.role}</Text>
                <Text width={15} color={agent.status === 'active' ? 'success' : agent.status === 'error' ? 'error' : 'suggestion'}>
                  {agent.status.toUpperCase()}
                </Text>
                <Text dimColor>{agent.action}</Text>
                {agent.tokenCount && <Text dimColor> ({agent.tokenCount} tokens)</Text>}
              </Box>
            ))}
          </Box>
        )}

        <Box marginTop={1} borderTopDimColor borderStyle="single" width="100%">
          <Text dimColor>Press Esc to exit God Mode Status</Text>
        </Box>
      </Box>
    </Dialog>
  );
}

export async function call(onDone: LocalJSXCommandOnDone, context: LocalJSXCommandContext): Promise<React.ReactNode> {
  return <GodModeStatus onDone={onDone} />;
}
