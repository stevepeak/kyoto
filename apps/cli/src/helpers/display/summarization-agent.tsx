import { analyzePlanSummarization } from '@app/agents'
import { type AgentRunState } from '@app/types'
import { type LanguageModel } from 'ai'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useRef, useState } from 'react'

import { Header } from '../../ui/header'
import { statusColor } from './agent-status'

interface SummarizationAgentProps {
  agentStates: AgentRunState[]
  gitRoot: string
  model: LanguageModel
  onComplete: (markdown: string) => void
  onError: (error: string) => void
}

export function SummarizationAgent({
  agentStates,
  gitRoot,
  model,
  onComplete,
  onError,
}: SummarizationAgentProps): React.ReactElement {
  const [state, setState] = useState<{
    status: AgentRunState['status']
    progress?: string
  }>({
    status: 'pending',
    progress: 'Queued',
  })
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (hasRunRef.current) {
      return
    }

    hasRunRef.current = true

    const updateState = (patch: Partial<typeof state>): void => {
      setState((prev) => ({ ...prev, ...patch }))
    }

    void (async () => {
      updateState({ status: 'running', progress: 'Starting...' })

      try {
        const result = await analyzePlanSummarization({
          agentStates,
          gitRoot,
          options: {
            model,
            progress: (message: string) => {
              updateState({ progress: message })
            },
          },
        })

        updateState({ status: 'success', progress: 'Complete' })
        onComplete(result.markdown)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during summarization'
        updateState({ status: 'fail', progress: message })
        onError(message)
      }
    })()
  }, [agentStates, gitRoot, model, onComplete, onError])

  return (
    <Box flexDirection="column" marginTop={1}>
      <Header kanji="計" title="Planning" />
      <Box width="80%">
        <Text wrap="truncate">
          {state.status === 'running' ? (
            <Text color="red">
              <Spinner type="dots" />{' '}
            </Text>
          ) : (
            <Text color={statusColor[state.status]}>• </Text>
          )}
          Summarizing plan <Text color="grey">{state.progress}</Text>
        </Text>
      </Box>
    </Box>
  )
}
