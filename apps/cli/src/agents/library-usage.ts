import { analyzeLibraryUsage } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'
import { pluralize } from '@app/utils'

export const libraryUsageAgent: VibeCheckAgent = {
  id: 'library-usage',
  label: 'Library usage',
  description:
    'Check library usage against documentation to ensure best practices and avoid reinventing the wheel',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Analyzing library usage...')

    const result = await analyzeLibraryUsage({
      context,
      options: { progress: reporter.progress },
    })

    if (result.findings.length === 0) {
      return {
        status: 'pass',
        summary: 'Library usage follows best practices',
        findings: [],
      }
    }

    return {
      status: 'warn',
      summary: `${result.findings.length} library usage ${pluralize(result.findings.length, 'issue')} found`,
      findings: result.findings,
    }
  },
}
