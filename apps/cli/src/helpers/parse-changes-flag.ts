/**
 * Parses the --changes flag value which accepts file:lines format.
 * Example: "file1.ts:1-10,file2.ts:20-30" or "file1.ts:1-10,file2.ts:20-30,file3.ts:5"
 *
 * @param changesValue - The raw value from --changes flag
 * @returns Array of { file, lines } objects, or null if parsing fails
 */
export function parseChangesFlag(
  changesValue: string,
): { file: string; lines: string }[] | null {
  if (!changesValue || changesValue.trim().length === 0) {
    return null
  }

  const parts = changesValue
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return null
  }

  const changes: { file: string; lines: string }[] = []

  for (const part of parts) {
    // Split on the last colon to handle file paths that might contain colons
    const lastColonIndex = part.lastIndexOf(':')
    if (lastColonIndex === -1) {
      // No colon found, treat entire part as file path
      changes.push({ file: part, lines: '' })
      continue
    }

    const file = part.slice(0, lastColonIndex)
    const lines = part.slice(lastColonIndex + 1)

    if (!file || file.length === 0) {
      return null // Invalid format
    }

    changes.push({ file, lines })
  }

  return changes.length > 0 ? changes : null
}
