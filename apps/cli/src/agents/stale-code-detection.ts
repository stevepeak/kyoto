import { analyzeStaleCodeDetection } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'

export const staleCodeDetectionAgent: VibeCheckAgent = {
  id: 'stale-code-detection',
  label: 'Stale code detection',
  description:
    'Detect unused code that was added in scope or became unreachable due to changes',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Starting...')

    const result = await analyzeStaleCodeDetection({
      scope: context.scope,
      options: {
        model: context.model,
        progress: reporter.progress,
      },
    })

    if (result.findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No stale code detected',
        findings: [],
      }
    }

    return {
      status: 'warn',
      summary: `${result.findings.length} stale code issue${result.findings.length === 1 ? '' : 's'} found`,
      findings: result.findings,
    }
  },
}
