import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React from 'react'

import { type AgentRunState } from '../vibe-check/types'
import { SectionHeader } from './section-header'

const statusColor: Record<AgentRunState['status'], string> = {
  pending: 'grey',
  running: 'red',
  success: 'green',
  warn: 'yellow',
  fail: 'red',
}

export function AgentSpinnerList({
  states,
}: {
  states: AgentRunState[]
}): React.ReactElement | null {
  if (states.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <SectionHeader kanji="改善" title="Vibe checks" />
      {states.map((state) => (
        <Box key={state.id} gap={1}>
          {state.status === 'running' ? (
            <Text color={statusColor[state.status]}>
              <Spinner type="dots" />
            </Text>
          ) : (
            <Text color={statusColor[state.status]}>•</Text>
          )}
          <Text>
            {state.label}{' '}
            <Text color="grey">{state.progress ?? 'Pending...'}</Text>
          </Text>
        </Box>
      ))}
    </Box>
  )
}
