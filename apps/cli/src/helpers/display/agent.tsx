import {
  type AgentRunState,
  type VibeCheckAgent,
  type VibeCheckContext,
} from '@app/types'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useRef, useState } from 'react'

import { statusColor } from './agent-status'

export function Agent({
  agent,
  context,
  onComplete,
}: {
  agent: VibeCheckAgent
  context: VibeCheckContext
  onComplete: (state: AgentRunState) => void
}): React.ReactElement {
  const [state, setState] = useState<AgentRunState>({
    id: agent.id,
    label: agent.label,
    status: 'pending',
    progress: 'Queued',
  })
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (hasRunRef.current) {
      return
    }

    hasRunRef.current = true

    const updateState = (patch: Partial<AgentRunState>): void => {
      setState((prev) => {
        const next = { ...prev, ...patch }
        return next
      })
    }

    void (async () => {
      updateState({ status: 'running', progress: 'Starting...' })

      const reporter = {
        progress: (message: string) => {
          updateState({ progress: message })
        },
      }

      try {
        const result = await agent.run(context, reporter)
        const status =
          result.status === 'pass'
            ? 'success'
            : (result.status as AgentRunState['status'])

        const finalState: AgentRunState = {
          id: agent.id,
          label: agent.label,
          status,
          progress: result.summary,
          result,
        }

        updateState(finalState)
        onComplete(finalState)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred'
        const finalState: AgentRunState = {
          id: agent.id,
          label: agent.label,
          status: 'fail',
          progress: message,
          error: message,
        }

        updateState(finalState)
        onComplete(finalState)
      }
    })()
  }, [agent, context, onComplete])

  return (
    <Box width="75%">
      <Text wrap="truncate">
        {state.status === 'running' ? (
          <Text color="red">
            <Spinner type="dots" />{' '}
          </Text>
        ) : (
          <Text color={statusColor[state.status]}>• </Text>
        )}
        {state.label} <Text color="grey">{state.progress}</Text>
      </Text>
    </Box>
  )
}
