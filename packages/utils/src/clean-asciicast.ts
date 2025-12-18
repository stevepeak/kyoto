type AsciicastEvent = [number, string, string]

/**
 * ANSI color codes
 */
const RED = '\x1b[31m'
const GREY = '\x1b[90m'
const RESET = '\x1b[0m'

/**
 * Replaces UUID% prompt markers with colored "入::"
 * Example: "79692d63-1269-4cd9-b7b7-4059230e06ee%" becomes "入::" (red 入, grey ::)
 */
function replaceUuidPrompt(args: { output: string }): string {
  // Replace UUID% pattern with colored "入::"
  // Pattern: UUID format (8-4-4-4-12 hex digits) followed by %
  return args.output.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}%/gi,
    `${RED}入${GREY}::${RESET}`,
  )
}

/**
 * Cleans an asciicast recording by replacing UUID% prompt markers
 */
export function cleanAsciicast(args: { content: string }): string {
  const lines = args.content.split('\n').filter(Boolean)
  const cleanedLines: string[] = []

  for (const line of lines) {
    // Keep metadata lines as-is (lines starting with {)
    if (line.startsWith('{')) {
      cleanedLines.push(line)
      continue
    }

    // Parse asciicast event
    const event = JSON.parse(line) as AsciicastEvent
    const [timestamp, type, output] = event

    // Only process output events (type 'o')
    if (type === 'o') {
      const cleaned = replaceUuidPrompt({ output })

      // Create cleaned event
      const cleanedEvent: AsciicastEvent = [timestamp, type, cleaned]
      cleanedLines.push(JSON.stringify(cleanedEvent))
    } else {
      // Keep non-output events as-is
      cleanedLines.push(line)
    }
  }

  return cleanedLines.join('\n') + '\n'
}
