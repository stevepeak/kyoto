import { analyzeStaleCodeDetection } from '@app/agents'
import { pluralize } from '@app/utils'

import { createVibeCheckAgent } from './factory'

export const staleCodeDetectionAgent = createVibeCheckAgent({
  id: 'stale-code-detection',
  label: 'Stale code detection',
  description:
    'Detect unused code that was added in scope or became unreachable due to changes',
  analyzerFn: analyzeStaleCodeDetection,
  summary: {
    type: 'simple',
    passSummary: 'No stale code detected',
    findingSummary: (count) =>
      `${count} stale code ${pluralize(count, 'issue')} found`,
  },
})
