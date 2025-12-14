import { analyzeFunctionConsolidation } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'
import { pluralize } from '@app/utils'

export const functionConsolidationAgent: VibeCheckAgent = {
  id: 'function-consolidation',
  label: 'Function consolidation',
  description:
    'Highlight opportunities to merge or extract shared helpers from similar functions',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Starting...')

    const result = await analyzeFunctionConsolidation({
      context,
      options: { progress: reporter.progress },
    })

    if (result.findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No consolidation targets detected',
        findings: [],
      }
    }

    return {
      status: 'warn',
      summary: `${result.findings.length} consolidation ${pluralize(result.findings.length, 'candidate')}`,
      findings: result.findings,
    }
  },
}
