import { functionConsolidationAgent } from './function-consolidation'
import { largeFilesAgent } from './large-files'
import { staleCodePathsAgent } from './stale-code-paths'

export const defaultVibeCheckAgents = [
  largeFilesAgent,
  functionConsolidationAgent,
  staleCodePathsAgent,
]

export { functionConsolidationAgent } from './function-consolidation'
export { largeFilesAgent } from './large-files'
export { staleCodePathsAgent } from './stale-code-paths'
export { storyImpactAgent } from './story-impact'
