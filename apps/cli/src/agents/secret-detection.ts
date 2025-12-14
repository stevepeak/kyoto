import { analyzeSecretDetection } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'
import { pluralize } from '@app/utils'

export const secretDetectionAgent: VibeCheckAgent = {
  id: 'secret-detection',
  label: 'Secret detection',
  description:
    'Scan code changes for leaked secrets, API keys, passwords, and other sensitive information',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Starting...')

    const result = await analyzeSecretDetection({
      context,
      options: { progress: reporter.progress },
    })

    if (result.findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No secrets or sensitive information detected',
        findings: [],
      }
    }

    // Determine overall status based on findings
    const hasErrors = result.findings.some((f) => f.severity === 'error')
    const hasWarnings = result.findings.some((f) => f.severity === 'warn')

    const status = hasErrors ? 'fail' : hasWarnings ? 'warn' : 'pass'

    return {
      status,
      summary: `${result.findings.length} potential ${pluralize(result.findings.length, 'secret')} detected`,
      findings: result.findings,
    }
  },
}
