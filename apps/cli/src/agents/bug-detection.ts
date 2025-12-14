import { analyzeBugDetection } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'
import { pluralize } from '@app/utils'

export const bugDetectionAgent: VibeCheckAgent = {
  id: 'bug-detection',
  label: 'Bug detection',
  description:
    'Detect bugs, logic errors, and potential runtime issues within the scope',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Starting...')

    const result = await analyzeBugDetection({
      context,
      options: { progress: reporter.progress },
    })

    if (result.findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No bugs detected',
        findings: [],
      }
    }

    const errorCount = result.findings.filter(
      (f) => f.severity === 'error',
    ).length
    const warnCount = result.findings.filter(
      (f) => f.severity === 'warn',
    ).length

    // Determine overall status based on findings
    let status: 'pass' | 'warn' | 'fail' = 'pass'
    if (errorCount > 0) {
      status = 'fail'
    } else if (warnCount > 0) {
      status = 'warn'
    }

    const summaryParts: string[] = []
    if (errorCount > 0) {
      summaryParts.push(
        `${errorCount} critical ${pluralize(errorCount, 'bug')}`,
      )
    }
    if (warnCount > 0) {
      summaryParts.push(
        `${warnCount} potential ${pluralize(warnCount, 'issue')}`,
      )
    }
    if (result.findings.length > errorCount + warnCount) {
      const infoCount = result.findings.length - errorCount - warnCount
      summaryParts.push(
        `${infoCount} code quality ${pluralize(infoCount, 'note')}`,
      )
    }

    return {
      status,
      summary: summaryParts.join(', '),
      findings: result.findings,
    }
  },
}
