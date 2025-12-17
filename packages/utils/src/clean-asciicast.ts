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
 * Checks if text contains only marker-related fragments
 */
function isOnlyMarkerContent(text: string): boolean {
  // Remove ANSI codes - using String.fromCharCode to avoid linter issues
  const esc = String.fromCharCode(0x1b)
  const withoutAnsi = text.replace(
    new RegExp(`${esc}\\[[0-9;]*[a-zA-Z]`, 'g'),
    '',
  )
  // Remove backspace and other control chars for checking
  const cleaned = withoutAnsi.replace(/[\b\r\n]/g, '')
  const trimmed = cleaned.trim()

  if (!trimmed) return false

  // Check for complete marker pattern
  if (/__CMD_END_\d+__/.test(trimmed)) return true

  // Check for marker fragments that appear alone
  // Patterns like: "ech", "o \"", "_CMD_END_", long digit sequences, "__\""
  const markerFragmentPattern =
    /^(ech|o\s*\\?["']|_CMD_END_|__\\?["']|;\s*echo|echo\s*\\?["']__CMD|CMD_END|__CM|D_END)/i
  if (markerFragmentPattern.test(trimmed)) {
    // If it's only the fragment with no other meaningful content, it's a marker
    const withoutFragment = trimmed.replace(markerFragmentPattern, '').trim()
    return !withoutFragment || /^[\d\s"';_]*$/.test(withoutFragment)
  }

  // Check for long digit sequences that are likely marker IDs (10+ digits)
  // Marker IDs are typically 13 digits (timestamp in milliseconds)
  if (/^\d{10,}$/.test(trimmed)) return true

  // Check for partial marker ID digits (like "765935458", "090", "61840")
  // These appear when the marker is split across events
  // If it's only digits (3+ characters) with no other visible content, it's likely a fragment
  // Marker IDs are 13 digits, so partial fragments are common
  if (/^\d{3,}$/.test(trimmed)) {
    // Remove all digits and check if anything meaningful remains
    const withoutDigits = trimmed.replace(/\d/g, '').trim()
    return !withoutDigits || withoutDigits.length === 0
  }

  // Check for fragments ending with digits and quotes (like "090__\"")
  if (/^\d+__\\?["']?$/.test(trimmed)) return true

  // Check for command fragments that end with semicolon (like " -la; ")
  // These are often followed by "echo" marker commands
  if (/^[\s]*[-a-z]+\s*;\s*$/.test(trimmed)) return true

  // Check for fragments like "la; ec" (part of "ls -la; echo")
  if (/la;\s*ec/.test(trimmed) && trimmed.length < 10) return true

  return false
}

/**
 * Cleans an asciicast recording by removing command markers.
 * Removes patterns like:
 * - `; echo "__CMD_END_123__"` appended to commands
 * - `__CMD_END_123__` output lines
 * - Marker fragments split across multiple events
 */
export function cleanAsciicast(args: { content: string }): string {
  const lines = args.content.split('\n').filter(Boolean)
  const cleanedLines: string[] = []
  const events: AsciicastEvent[] = []

  // First pass: collect all events
  for (const line of lines) {
    if (line.startsWith('{')) {
      cleanedLines.push(line)
      continue
    }
    events.push(JSON.parse(line) as AsciicastEvent)
  }

  // Second pass: process events, checking consecutive ones for split patterns
  for (let i = 0; i < events.length; i++) {
    const [timestamp, type, output] = events[i]

    if (type !== 'o') {
      cleanedLines.push(JSON.stringify(events[i]))
      continue
    }

    // Check if this event is only marker content
    if (isOnlyMarkerContent(output)) {
      continue
    }

    // Check if this and next few events form a marker pattern when concatenated
    // (events with same or very close timestamps are likely split)
    const baseTime = timestamp
    let skipToIndex = i

    // Check consecutive events with same timestamp (within 0.01s) for split patterns
    for (let j = i + 1; j < events.length; j++) {
      const [nextTime, nextType, nextOutput] = events[j]
      if (nextType !== 'o' || Math.abs(nextTime - baseTime) > 0.01) break

      // If next event is only marker content, mark it to skip
      if (isOnlyMarkerContent(nextOutput)) {
        skipToIndex = j
        continue
      }

      // Check if combined forms a complete marker pattern
      const combined = output + nextOutput
      if (
        /;\s*echo\s+\\?["']__CMD_END_\d+__\\?["']/.test(combined) ||
        /__CMD_END_\d+__/.test(combined)
      ) {
        skipToIndex = j
        break
      }

      break
    }

    // Skip all events from i to skipToIndex if we found a marker pattern
    if (skipToIndex > i) {
      i = skipToIndex
      continue
    }

    // Remove marker patterns from output
    const cleaned = output
      // Replace "; echo \"__CMD_END_...__\"" with newline (handles escaped quotes)
      .replace(/;\s*echo\s+\\?["']__CMD_END_\d+__\\?["']/g, '\n')
      // Replace "|| true; echo \"__CMD_END_...__\"" with newline
      .replace(/\|\|\s*true;\s*echo\s+\\?["']__CMD_END_\d+__\\?["']/g, '\n')
      // Remove standalone marker output lines
      .replace(/__CMD_END_\d+__\r?\n?/g, '')
      // Remove partial marker patterns (split across events)
      .replace(/;\s*echo\s*\\?["']?__?CMD/gi, '')
      .replace(/echo\s*\\?["']?__?CMD/gi, '')
      .replace(/_CMD_END_\d*/g, '')
      // Remove trailing marker fragments
      .replace(/__\\?["']?\s*$/g, '')
      // Remove UUID% prompt markers
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
