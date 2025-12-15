import { type AgentRunState, type VibeCheckFinding } from '@app/types'

export interface ConsolidatedFinding extends VibeCheckFinding {
  agentLabel: string
  agentId: string
}

/**
 * Consolidates all findings from all agent states into a single list
 * with agent context attached.
 */
export function consolidateFindings(
  agentStates: AgentRunState[],
): ConsolidatedFinding[] {
  const consolidated: ConsolidatedFinding[] = []

  for (const state of agentStates) {
    const findings = state.result?.findings ?? []
    for (const finding of findings) {
      consolidated.push({
        ...finding,
        agentLabel: state.label,
        agentId: state.id,
      })
    }
  }

  return consolidated
}

/**
 * Sorts findings by priority:
 * 1. Severity (error > warn > info)
 * 2. Path (group same files together)
 * 3. Message (alphabetically within same severity/path)
 */
export function sortFindingsByPriority(
  findings: ConsolidatedFinding[],
): ConsolidatedFinding[] {
  const severityOrder: Record<string, number> = {
    error: 0,
    warn: 1,
    info: 2,
  }

  return [...findings].sort((a, b) => {
    // First by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) {
      return severityDiff
    }

    // Then by path (group same files together)
    const pathA = a.path ?? ''
    const pathB = b.path ?? ''
    const pathDiff = pathA.localeCompare(pathB)
    if (pathDiff !== 0) {
      return pathDiff
    }

    // Finally by message
    return a.message.localeCompare(b.message)
  })
}

/**
 * Creates a unique identifier for a finding.
 */
export function getFindingId(finding: ConsolidatedFinding): string {
  // Combine agent ID, message, and path to create a unique ID
  const parts = [finding.agentId, finding.message]
  if (finding.path) {
    parts.push(finding.path)
  }
  return parts.join('|')
}
