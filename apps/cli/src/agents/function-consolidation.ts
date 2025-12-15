import { analyzeFunctionConsolidation } from '@app/agents'
import { pluralize } from '@app/utils'

import { createVibeCheckAgent } from './factory'

export const functionConsolidationAgent = createVibeCheckAgent({
  id: 'function-consolidation',
  label: 'Function consolidation',
  description:
    'Highlight opportunities to merge or extract shared helpers from similar functions',
  analyzerFn: analyzeFunctionConsolidation,
  summary: {
    type: 'simple',
    passSummary: 'No consolidation targets detected',
    findingSummary: (count) =>
      `${count} consolidation ${pluralize(count, 'candidate')}`,
  },
})
