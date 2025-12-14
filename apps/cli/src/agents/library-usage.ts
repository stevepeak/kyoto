import { analyzeLibraryUsage } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'

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
      summary: `${result.findings.length} library usage issue${result.findings.length === 1 ? '' : 's'} found`,
      findings: result.findings,
    }
  },
}
