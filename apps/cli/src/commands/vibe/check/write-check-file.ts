import { type VibeCheckAgentResult, type VibeCheckFile } from '@app/schemas'
import { type AgentRunState, type VibeCheckScope } from '@app/types'
import * as fs from 'node:fs/promises'

import { pwdKyoto } from '../../../helpers/config/find-kyoto-dir'

/**
 * Transforms AgentRunState[] to VibeCheckAgentResult[] for the check.json schema
 */
function transformAgentStates(states: AgentRunState[]): VibeCheckAgentResult[] {
  return states.map((state) => ({
    id: state.id,
    label: state.label,
    status:
      state.status === 'fail'
        ? 'fail'
        : state.status === 'warn'
          ? 'warn'
          : 'success',
    findings: state.result?.findings ?? [],
  }))
}

/**
 * Writes the vibe check results to .kyoto/vibe/check/check.json
 */
export async function writeVibeCheckFile(args: {
  gitRoot: string
  scope: VibeCheckScope
  branch: string | null
  headCommit: string | null
  agentStates: AgentRunState[]
}): Promise<void> {
  const { gitRoot, scope, branch, headCommit, agentStates } = args

  const vibeCheckFile: VibeCheckFile = {
    version: 1,
    timestamp: new Date().toISOString(),
    git: {
      branch: branch ?? undefined,
      headCommit: headCommit ?? undefined,
      scope,
    },
    agents: transformAgentStates(agentStates),
  }

  const kyotoPaths = await pwdKyoto(gitRoot)

  // Write the file
  await fs.writeFile(
    kyotoPaths.vibeCheck,
    JSON.stringify(vibeCheckFile, null, 2),
  )
}
