import {
  type AgentRunState,
  type VibeCheckAgent,
  type VibeCheckContext,
} from '@app/types'
import { Box } from 'ink'
import React, { useCallback, useRef, useState } from 'react'

import { Header } from '../../ui/header'
import { Agent } from './agent'

export function VibeAgents({
  agents,
  context,
  onComplete,
  timeoutMinutes = 1,
}: {
  agents: VibeCheckAgent[]
  context: VibeCheckContext
  onComplete?: (finalStates: AgentRunState[]) => void
  timeoutMinutes?: number
}): React.ReactElement | null {
  const [_, setFinalStates] = useState<AgentRunState[]>([])
  const hasCalledCompleteRef = useRef(false)

  const handleAgentComplete = useCallback(
    (state: AgentRunState) => {
      setFinalStates((prev) => {
        const index = prev.findIndex((s) => s.id === state.id)
        const next =
          index === -1
            ? [...prev, state]
            : prev.map((s) => (s.id === state.id ? state : s))

        if (
          onComplete &&
          !hasCalledCompleteRef.current &&
          next.length === agents.length
        ) {
          hasCalledCompleteRef.current = true
          onComplete(next)
        }

        return next
      })
    },
    [agents.length, onComplete],
  )

  if (agents.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Header kanji="改善" title="Vibe checking" />
      {agents.map((agent) => (
        <Agent
          key={agent.id}
          agent={agent}
          context={context}
          onComplete={handleAgentComplete}
          timeoutMinutes={timeoutMinutes}
        />
      ))}
    </Box>
  )
}
