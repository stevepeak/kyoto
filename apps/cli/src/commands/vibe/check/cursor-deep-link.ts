import { type ConsolidatedFinding } from './findings'

/**
 * Generates a Cursor deep link URL that spawns a new agent with a prompt
 * to fix the specified finding.
 */
export function generateCursorDeepLink(finding: ConsolidatedFinding): string {
  const promptParts: string[] = []

  // Add the finding message
  promptParts.push(`Fix: ${finding.message}`)

  // Add file path if available
  if (finding.path) {
    promptParts.push(`\n\nFile: ${finding.path}`)
  }

  // Add suggestion if available
  if (finding.suggestion) {
    promptParts.push(`\n\nSuggestion: ${finding.suggestion}`)
  }

  // Add context about the agent that found it
  promptParts.push(
    `\n\nThis issue was detected by the ${finding.agentLabel} agent.`,
  )

  // Add severity context
  const severityContext =
    finding.severity === 'error'
      ? 'This is a critical issue that must be fixed.'
      : finding.severity === 'warn'
        ? 'This is an important issue that should be addressed.'
        : 'This is a code improvement suggestion.'

  promptParts.push(severityContext)

  const prompt = promptParts.join('')

  // Use encodeURIComponent to encode spaces as %20 (not + which URLSearchParams uses)
  // Cursor's deep link handler expects %20 for spaces
  return `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(prompt)}`
}
