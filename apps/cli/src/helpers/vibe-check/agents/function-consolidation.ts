import { analyzeFunctionConsolidation } from '@app/agents'

import {
  type VibeCheckAgent,
  type VibeCheckFinding,
  type VibeCheckResult,
} from '../types'

function toFindings(
  suggestions: Awaited<
    ReturnType<typeof analyzeFunctionConsolidation>
  >['suggestions'],
): VibeCheckFinding[] {
  return suggestions.map((suggestion) => {
    const functions = suggestion.functions
      .map((fn) => `${fn.name} (${fn.file})`)
      .join(' ↔ ')

    return {
      message: functions,
      path: suggestion.functions[0]?.file,
      suggestion: suggestion.reasoning,
      severity: 'warn',
    }
  })
}

export const functionConsolidationAgent: VibeCheckAgent = {
  id: 'function-consolidation',
  label: 'Function consolidation',
  description:
    'Highlight opportunities to merge or extract shared helpers from similar functions',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Starting agent')

    const result = await analyzeFunctionConsolidation({
      scope: context.scope,
      options: {
        progress: reporter.progress,
      },
    })

    const findings = toFindings(result.suggestions ?? [])

    if (findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No consolidation targets detected',
        findings: [],
      }
    }

    return {
      status: 'warn',
      summary: `${findings.length} consolidation candidate${findings.length === 1 ? '' : 's'}`,
      findings,
    }
  },
}
