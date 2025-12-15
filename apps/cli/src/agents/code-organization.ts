import { analyzeCodeOrganization } from '@app/agents'
import { pluralize } from '@app/utils'

import { createVibeCheckAgent } from './factory'

export const codeOrganizationAgent = createVibeCheckAgent({
  id: 'code-organization',
  label: 'Code organization',
  description:
    'Find functions and components that should be moved to other packages or extracted into helper functions to reduce file sizes',
  analyzerFn: analyzeCodeOrganization,
  summary: {
    type: 'simple',
    passSummary: 'No code organization issues detected',
    findingSummary: (count) =>
      `${count} organization ${pluralize(count, 'issue')} found`,
  },
})
