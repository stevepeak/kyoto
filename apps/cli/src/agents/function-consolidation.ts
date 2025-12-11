import { analyzeFunctionConsolidation } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'

export const functionConsolidationAgent: VibeCheckAgent = {
  id: 'function-consolidation',
  label: 'Function consolidation',
  description:
    'Highlight opportunities to merge or extract shared helpers from similar functions',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Starting...')

    const result = await analyzeFunctionConsolidation({
      scope: context.scope,
      options: {
        model: context.model,
        progress: reporter.progress,
      },
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
      summary: `${result.findings.length} consolidation candidate${result.findings.length === 1 ? '' : 's'}`,
      findings: result.findings,
    }
  },
}
