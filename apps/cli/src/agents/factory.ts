import {
  type VibeCheckAgent,
  type VibeCheckContext,
  type VibeCheckFinding,
  type VibeCheckReporter,
  type VibeCheckResult,
} from '@app/types'
import { pluralize } from '@app/utils'

type AnalyzerFn = (args: {
  context: VibeCheckContext
  options: { progress: (message: string) => void }
}) => Promise<{
  findings: VibeCheckFinding[]
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

      // Cap code-organization severity at WARN
      const processedFindings = result.findings.map((finding) => {
        if (id === 'code-organization') {
          if (
            finding.severity === 'error' ||
            finding.severity === 'high' ||
            finding.severity === 'bug'
          ) {
            return { ...finding, severity: 'warn' as const }
          }
        }
        return finding
      })

      if (processedFindings.length === 0) {
        return {
          status: 'pass',
          summary: summary.passSummary,
          findings: [],
        }
      }

      if (summary.type === 'simple') {
        return {
          status: 'warn',
          summary: summary.findingSummary(processedFindings.length),
          findings: processedFindings,
        }
      }

      // Both severity-based and severity-status need to compute status from severities
      const hasErrors = processedFindings.some(
        (f) => f.severity === 'error' || f.severity === 'high',
      )
      const hasBugs = processedFindings.some((f) => f.severity === 'bug')
      const hasWarnings = processedFindings.some((f) => f.severity === 'warn')
      const status: 'pass' | 'warn' | 'fail' =
        hasErrors || hasBugs ? 'fail' : hasWarnings ? 'warn' : 'pass'

      if (summary.type === 'severity-status') {
        return {
          status,
          summary: summary.findingSummary(processedFindings.length),
          findings: processedFindings,
        }
      }

      // severity-based: detailed summary with counts per severity
      const errorCount = processedFindings.filter(
        (f) => f.severity === 'error',
      ).length
      const bugCount = processedFindings.filter(
        (f) => f.severity === 'bug',
      ).length
      const highCount = processedFindings.filter(
        (f) => f.severity === 'high',
      ).length
      const warnCount = processedFindings.filter(
        (f) => f.severity === 'warn',
      ).length

      const summaryParts: string[] = []
      if (errorCount > 0) {
        summaryParts.push(
          `${errorCount} logical ${pluralize(errorCount, 'error')}`,
        )
      }
      if (bugCount > 0) {
        summaryParts.push(`${bugCount} ${pluralize(bugCount, 'bug')}`)
      }
      if (highCount > 0) {
        summaryParts.push(
          `${highCount} high severity ${pluralize(highCount, 'issue')}`,
        )
      }
      if (warnCount > 0) {
        summaryParts.push(
          `${warnCount} potential ${pluralize(warnCount, 'issue')}`,
        )
      }
      if (
        processedFindings.length >
        errorCount + bugCount + highCount + warnCount
      ) {
        const infoCount =
          processedFindings.length -
          errorCount -
          bugCount -
          highCount -
          warnCount
        summaryParts.push(
          `${infoCount} code quality ${pluralize(infoCount, 'note')}`,
        )
      }

      return {
        status,
        summary: summaryParts.join(', '),
        findings: processedFindings,
      }
    },
  }
}
