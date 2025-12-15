import {
  type VibeCheckAgent,
  type VibeCheckContext,
  type VibeCheckReporter,
  type VibeCheckResult,
} from '@app/types'
import { pluralize } from '@app/utils'

type AnalyzerFn = (args: {
  context: VibeCheckContext
  options: { progress: (message: string) => void }
}) => Promise<{
  findings: {
    message: string
    path?: string
    suggestion?: string
    severity: 'info' | 'warn' | 'error'
  }[]
}>

type SummaryConfig =
  | {
      type: 'simple'
      passSummary: string
      findingSummary: (count: number) => string
    }
  | { type: 'severity-based'; passSummary: string }
  | {
      type: 'severity-status'
      passSummary: string
      findingSummary: (count: number) => string
    }

type CreateVibeCheckAgentConfig = {
  id: string
  label: string
  description: string
  analyzerFn: AnalyzerFn
  progressMessage?: string
  summary: SummaryConfig
}

export function createVibeCheckAgent(
  config: CreateVibeCheckAgentConfig,
): VibeCheckAgent {
  const {
    id,
    label,
    description,
    analyzerFn,
    progressMessage = 'Starting...',
    summary,
  } = config

  return {
    id,
    label,
    description,
    async run(
      context: VibeCheckContext,
      reporter: VibeCheckReporter,
    ): Promise<VibeCheckResult> {
      reporter.progress(progressMessage)

      const result = await analyzerFn({
        context,
        options: { progress: reporter.progress },
      })

      if (result.findings.length === 0) {
        return {
          status: 'pass',
          summary: summary.passSummary,
          findings: [],
        }
      }

      if (summary.type === 'simple') {
        return {
          status: 'warn',
          summary: summary.findingSummary(result.findings.length),
          findings: result.findings,
        }
      }

      // Both severity-based and severity-status need to compute status from severities
      const hasErrors = result.findings.some((f) => f.severity === 'error')
      const hasWarnings = result.findings.some((f) => f.severity === 'warn')
      const status: 'pass' | 'warn' | 'fail' = hasErrors
        ? 'fail'
        : hasWarnings
          ? 'warn'
          : 'pass'

      if (summary.type === 'severity-status') {
        return {
          status,
          summary: summary.findingSummary(result.findings.length),
          findings: result.findings,
        }
      }

      // severity-based: detailed summary with counts per severity
      const errorCount = result.findings.filter(
        (f) => f.severity === 'error',
      ).length
      const warnCount = result.findings.filter(
        (f) => f.severity === 'warn',
      ).length

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
}
