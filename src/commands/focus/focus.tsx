import * as React from 'react';
import { Box, Text } from '../../ink.js';
import { useTuiOrchestrator } from '../../hooks/useTuiOrchestrator.js';
import type { LocalJSXCommandContext } from '../../commands.js';
import type { LocalJSXCommandOnDone } from '../../types/command.js';
import { Dialog } from '../../components/design-system/Dialog.js';

function GodModeFocus({ onDone }: { onDone: LocalJSXCommandOnDone }): React.ReactNode {
  const { agents } = useTuiOrchestrator("ws://localhost:3000/ws/orchestrator");
  const [focusedAgentId, setFocusedAgentId] = React.useState<string | null>(null);

  const focusedAgent = agents.find(a => a.id === focusedAgentId);

  return (
    <Dialog title="GOD MODE: Agent Focus" onCancel={() => onDone()} color="info">
      <Box flexDirection="column" width="100%">
        {!focusedAgentId ? (
          <Box flexDirection="column">
            <Text bold marginBottom={1}>Select an agent to focus on:</Text>
            {agents.length === 0 ? (
              <Text dimColor>No agents available.</Text>
            ) : (
              <Box flexDirection="column">
                {agents.map(agent => (
                  <Box key={agent.id} onClick={() => setFocusedAgentId(agent.id)}>
                    <Text color="suggestion">❯ </Text>
                    <Text>{agent.id} ({agent.role})</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text bold>Focused Agent: </Text>
              <Text color="suggestion">{focusedAgent?.id || "Unknown"}</Text>
              <Box onClick={() => setFocusedAgentId(null)}>
                <Text color="info" marginLeft={2} underline>[ Back to list ]</Text>
              </Box>
            </Box>

            {focusedAgent ? (
              <Box flexDirection="column" paddingLeft={2}>
                <Box marginBottom={0.5}>
                  <Text bold>Role: </Text>
                  <Text>{focusedAgent.role}</Text>
                </Box>
                <Box marginBottom={0.5}>
                  <Text bold>Department: </Text>
                  <Text>{focusedAgent.department}</Text>
                </Box>
                <Box marginBottom={0.5}>
                  <Text bold>Status: </Text>
                  <Text color={focusedAgent.status === 'active' ? 'success' : 'suggestion'}>
                    {focusedAgent.status.toUpperCase()}
                  </Text>
                </Box>
                <Box marginBottom={0.5}>
                  <Text bold>Current Action: </Text>
                  <Text>{focusedAgent.action}</Text>
                </Box>
                <Box marginBottom={0.5}>
                  <Text bold>Tokens Consumed: </Text>
                  <Text>{focusedAgent.tokenCount || 0}</Text>
                </Box>
              </Box>
            ) : (
              <Text color="error">Agent no longer available.</Text>
            )}
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

export async function call(onDone: LocalJSXCommandOnDone, context: LocalJSXCommandContext): Promise<React.ReactNode> {
  return <GodModeFocus onDone={onDone} />;
}
