import { analyzeBugDetection } from '@app/agents'

import { createVibeCheckAgent } from './factory'

export const bugDetectionAgent = createVibeCheckAgent({
  id: 'bug-detection',
  label: 'Bug detection',
  description:
    'Detect bugs, logic errors, and potential runtime issues within the scope',
  analyzerFn: analyzeBugDetection,
  summary: {
    type: 'severity-based',
    passSummary: 'No bugs detected',
  },
})
