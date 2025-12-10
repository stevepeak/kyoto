import { largeFilesAgent } from './large-files'
import { otherChecksAgent } from './other-checks'
import { staleCodePathsAgent } from './stale-code-paths'

export const defaultVibeCheckAgents = [
  largeFilesAgent,
  staleCodePathsAgent,
  otherChecksAgent,
]

export { largeFilesAgent } from './large-files'
export { otherChecksAgent } from './other-checks'
export { staleCodePathsAgent } from './stale-code-paths'
export { storyImpactAgent } from './story-impact'
