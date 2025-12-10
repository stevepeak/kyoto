import {
  type AgentRunState,
  type VibeCheckAgent,
  type VibeCheckContext,
} from './types'

function createInitialState(agent: VibeCheckAgent): AgentRunState {
  return {
    id: agent.id,
    label: agent.label,
    status: 'pending',
    progress: 'Queued',
  }
}

export async function runVibeCheckAgents({
  agents,
  context,
  onUpdate,
}: {
  agents: VibeCheckAgent[]
  context: VibeCheckContext
  onUpdate?: (state: AgentRunState) => void
}): Promise<AgentRunState[]> {
  const states = agents.map(createInitialState)

  const updateState = (id: string, patch: Partial<AgentRunState>): void => {
    const index = states.findIndex((state) => state.id === id)
    if (index === -1) {
      return
    }

    states[index] = { ...states[index], ...patch }
    if (onUpdate) {
      onUpdate(states[index])
    }
  }

  await Promise.all(
    agents.map(async (agent) => {
      updateState(agent.id, { status: 'running', progress: 'Starting...' })
      const reporter = {
        progress: (message: string) => {
          updateState(agent.id, { progress: message })
        },
      }

      try {
        const result = await agent.run(context, reporter)
        const status =
          result.status === 'pass'
            ? 'success'
            : (result.status as AgentRunState['status'])
        updateState(agent.id, {
          status,
          progress: result.summary,
          result,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred'
        updateState(agent.id, {
          status: 'fail',
          progress: message,
          error: message,
        })
      }
    }),
  )

  return states
}
