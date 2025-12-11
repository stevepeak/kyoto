import { bugDetectionAgent } from './bug-detection'
import { codeOrganizationAgent } from './code-organization'
import { functionConsolidationAgent } from './function-consolidation'
import { secretDetectionAgent } from './secret-detection'
import { staleCodeDetectionAgent } from './stale-code-detection'

export const defaultVibeCheckAgents = [
  bugDetectionAgent,
  codeOrganizationAgent,
  functionConsolidationAgent,
  secretDetectionAgent,
  staleCodeDetectionAgent,
]
