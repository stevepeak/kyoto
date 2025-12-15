import { analyzeLibraryUsage } from '@app/agents'
import { pluralize } from '@app/utils'

import { createVibeCheckAgent } from './factory'

export const libraryUsageAgent = createVibeCheckAgent({
  id: 'library-usage',
  label: 'Library usage',
  description:
    'Check library usage against documentation to ensure best practices and avoid reinventing the wheel',
  analyzerFn: analyzeLibraryUsage,
  progressMessage: 'Analyzing library usage...',
  summary: {
    type: 'simple',
    passSummary: 'Library usage follows best practices',
    findingSummary: (count) =>
      `${count} library usage ${pluralize(count, 'issue')} found`,
  },
})
