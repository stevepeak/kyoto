type AsciicastEvent = [number, string, string]

/**
 * Cleans an asciicast recording by removing command markers.
 * Removes patterns like:
 * - `; echo "__CMD_END_123__"` appended to commands
 * - `__CMD_END_123__` output lines
 */
export function cleanAsciicast(args: { content: string }): string {
  const lines = args.content.split('\n').filter(Boolean)
  const cleanedLines: string[] = []

  for (const line of lines) {
    // First line is header metadata - keep as-is
    if (line.startsWith('{')) {
      cleanedLines.push(line)
      continue
    }

    const event = JSON.parse(line) as AsciicastEvent
    const [timestamp, type, output] = event

    if (type !== 'o') {
      cleanedLines.push(line)
      continue
    }

    // Remove marker patterns from output
    const cleaned = output
      // Remove "; echo \"__CMD_END_...__\"" from commands
      .replace(/;\s*echo\s*\\?"__CMD_END_\d+__\\?"/g, '')
      // Remove "|| true; echo \"__CMD_END_...__\"" pattern
      .replace(/\|\|\s*true;\s*echo\s*\\?"__CMD_END_\d+__\\?"/g, '')
      // Remove standalone marker output lines
      .replace(/__CMD_END_\d+__\r?\n?/g, '')
      // Remove UUID% prompt markers (e.g., "d865515-32a5-47d9-a998-efaad1643aa9%")
      .replace(
        /[0-9a-f]{7,8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}%/gi,
        '',
      )

    // Skip if output is now empty or just whitespace/control chars
    if (cleaned.replace(/[\r\n\s\u001b[\]0-9;GKHJm]*/g, '') === '') {
      continue
    }

    const cleanedEvent: AsciicastEvent = [timestamp, type, cleaned]
    cleanedLines.push(JSON.stringify(cleanedEvent))
  }

  return cleanedLines.join('\n') + '\n'
}
