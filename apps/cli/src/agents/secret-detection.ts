import { analyzeSecretDetection } from '@app/agents'
import { pluralize } from '@app/utils'

import { createVibeCheckAgent } from './factory'

export const secretDetectionAgent = createVibeCheckAgent({
  id: 'secret-detection',
  label: 'Secret detection',
  description:
    'Scan code changes for leaked secrets, API keys, passwords, and other sensitive information',
  analyzerFn: analyzeSecretDetection,
  summary: {
    type: 'severity-status',
    passSummary: 'No secrets or sensitive information detected',
    findingSummary: (count) =>
      `${count} potential ${pluralize(count, 'secret')} detected`,
  },
})
