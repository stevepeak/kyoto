type AsciicastEvent = [number, string, string]

function hasVisibleOutput(text: string): boolean {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)

    // Skip ANSI escape sequences.
    if (code === 0x1b) {
      const next = text.charCodeAt(index + 1)

      // CSI: ESC [ ... <final>
      if (next === 0x5b) {
        index += 2
        for (; index < text.length; index++) {
          const c = text.charCodeAt(index)
          if (
            (c >= 0x30 && c <= 0x39) || // 0-9
            c === 0x3b || // ;
            c === 0x3f || // ?
            (c >= 0x20 && c <= 0x2f) // intermediates
          ) {
            continue
          }
          if (c >= 0x40 && c <= 0x7e) {
            break
          }
          break
        }
        continue
      }

      // OSC: ESC ] ... BEL or ST (ESC \)
      if (next === 0x5d) {
        index += 2
        for (; index < text.length; index++) {
          const c = text.charCodeAt(index)
          if (c === 0x07) break
          if (c === 0x1b && text.charCodeAt(index + 1) === 0x5c) {
            index++
            break
          }
        }
        continue
      }

      continue
    }

    // Skip C0 controls + space + DEL.
    if (code <= 0x20 || code === 0x7f) continue

    return true
  }

  return false
}

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
    if (!hasVisibleOutput(cleaned)) {
      continue
    }

    const cleanedEvent: AsciicastEvent = [timestamp, type, cleaned]
    cleanedLines.push(JSON.stringify(cleanedEvent))
  }

  return cleanedLines.join('\n') + '\n'
}
