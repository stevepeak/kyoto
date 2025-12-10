import { type AgentRunState, type VibeCheckSeverity } from '@app/types'
import fs from 'fs/promises'
import path from 'path'

export interface PlanItem {
  id: string
  agentId: string
  agentLabel: string
  severity: VibeCheckSeverity
  message: string
  path?: string
  checked: boolean
}

const DEFAULT_TRUNCATION = 96

export function truncate(
  text: string,
  maxLength: number = DEFAULT_TRUNCATION,
): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength - 3)}...`
}

function formatFindingMessage(
  findingMessage: string,
  filePath?: string,
): string {
  const prefix = filePath ? `${filePath}: ` : ''
  return truncate(`${prefix}${findingMessage}`)
}

export function collectPlanItems(states: AgentRunState[]): PlanItem[] {
  const items: PlanItem[] = []

  for (const state of states) {
    const findings = state.result?.findings ?? []
    findings.forEach((finding, index) => {
      items.push({
        id: `${state.id}-${index}`,
        agentId: state.id,
        agentLabel: state.label,
        severity: finding.severity,
        path: finding.path,
        message: formatFindingMessage(finding.message, finding.path),
        checked: true,
      })
    })
  }

  return items
}

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

export function buildPlanMarkdown(states: AgentRunState[]): string {
  return states.map(formatAgentSection).join('\n\n').trimEnd() + '\n'
}

export async function writePlanFile(
  states: AgentRunState[],
  kyotoRoot: string,
): Promise<string> {
  const planPath = path.join(kyotoRoot, 'plan.md')
  const content = buildPlanMarkdown(states)
  await fs.writeFile(planPath, content, 'utf8')
  return planPath
}
