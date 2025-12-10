import { type VibeCheckAgent, type VibeCheckResult } from '../types'

export const otherChecksAgent: VibeCheckAgent = {
  id: 'other-checks',
  label: 'Other checks',
  description: 'Placeholder for additional safety rails',
  async run(_context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Scanning remaining items...')
    return {
      status: 'pass',
      summary: 'No additional checks enabled',
      findings: [],
    }
  },
}
