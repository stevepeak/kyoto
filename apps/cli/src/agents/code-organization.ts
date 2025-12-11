import { analyzeCodeOrganization } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'

export const codeOrganizationAgent: VibeCheckAgent = {
  id: 'code-organization',
  label: 'Code organization',
  description:
    'Find functions and components that should be moved to other packages or extracted into helper functions to reduce file sizes',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Starting...')

    const result = await analyzeCodeOrganization({
      scope: context.scope,
      options: {
        progress: reporter.progress,
      },
    })

    if (result.findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No code organization issues detected',
        findings: [],
      }
    }

    return {
      status: 'warn',
      summary: `${result.findings.length} organization issue${result.findings.length === 1 ? '' : 's'} found`,
      findings: result.findings,
    }
  },
}
