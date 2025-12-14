import { bugDetectionAgent } from './bug-detection'
import { codeOrganizationAgent } from './code-organization'
import { functionConsolidationAgent } from './function-consolidation'
import { libraryUsageAgent } from './library-usage'
import { secretDetectionAgent } from './secret-detection'
import { staleCodeDetectionAgent } from './stale-code-detection'

export const defaultVibeCheckAgents = [
  bugDetectionAgent,
  codeOrganizationAgent,
  functionConsolidationAgent,
  libraryUsageAgent,
  secretDetectionAgent,
  staleCodeDetectionAgent,
]
