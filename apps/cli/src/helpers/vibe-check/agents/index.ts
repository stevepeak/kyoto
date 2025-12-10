import { functionConsolidationAgent } from './function-consolidation'
import { largeFilesAgent } from './large-files'
import { otherChecksAgent } from './other-checks'
import { staleCodePathsAgent } from './stale-code-paths'

export const defaultVibeCheckAgents = [
  largeFilesAgent,
  functionConsolidationAgent,
  staleCodePathsAgent,
  otherChecksAgent,
]

export { functionConsolidationAgent } from './function-consolidation'
export { largeFilesAgent } from './large-files'
export { otherChecksAgent } from './other-checks'
export { staleCodePathsAgent } from './stale-code-paths'
export { storyImpactAgent } from './story-impact'
