import { type AgentRunState, type VibeCheckSeverity } from '@app/types'
import fs from 'fs/promises'
import path from 'path'

function formatSeverity(severity: VibeCheckSeverity): string {
  return severity.toUpperCase()
}

function formatAgentSection(state: AgentRunState): string {
  const lines: string[] = [`# ${state.label}`]
  const result = state.result

  if (!result) {
    lines.push(`Status: ${state.status.toUpperCase()}`)
    if (state.error) {
      lines.push(`Error: ${state.error}`)
    }
    return lines.join('\n')
  }

  lines.push(`Status: ${result.status.toUpperCase()}`)
  lines.push(`Summary: ${result.summary}`)

  const findings = result.findings ?? []

  if (findings.length === 0) {
    lines.push('No findings.')
    return lines.join('\n')
  }

  lines.push('Findings:')
  for (const finding of findings) {
    const parts = [`- [${formatSeverity(finding.severity)}] ${finding.message}`]
    if (finding.path) {
      parts.push(`  Path: ${finding.path}`)
    }
    if (finding.suggestion) {
      parts.push(`  Suggestion: ${finding.suggestion}`)
    }
    lines.push(parts.join('\n'))
  }

  return lines.join('\n')
}

function buildPlanMarkdown(states: AgentRunState[]): string {
  return states.map(formatAgentSection).join('\n\n').trimEnd() + '\n'
}

export async function writePlanFile(
  content: string | AgentRunState[],
  kyotoRoot: string,
): Promise<string> {
  const planPath = path.join(kyotoRoot, 'plan.md')
  const markdown =
    typeof content === 'string' ? content : buildPlanMarkdown(content)
  await fs.writeFile(planPath, markdown, 'utf8')
  return planPath
}
