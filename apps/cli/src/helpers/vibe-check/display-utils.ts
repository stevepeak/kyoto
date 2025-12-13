import { type VibeCheckSeverity } from '@app/types'

import { type ConsolidatedFinding } from './findings'

/**
 * Formats a severity level to uppercase string.
 */
export function formatSeverity(severity: VibeCheckSeverity): string {
  return severity.toUpperCase()
}

/**
 * Formats a finding into a display label with severity and optional path.
 */
export function formatFindingLabel(finding: ConsolidatedFinding): string {
  const severity = formatSeverity(finding.severity)
  const pathPart = finding.path ? ` (${finding.path})` : ''
  return `[${severity}] ${finding.message}${pathPart}`
}
