import { decompositionOutputSchema } from '@app/schemas'
import type { DecompositionOutput } from '@app/schemas'

/**
 * Parses decomposition data from unknown format (string or object)
 * and validates it against the decomposition schema
 */
export function parseDecomposition(
  decomposition: unknown,
): DecompositionOutput | null {
  if (!decomposition) {
    return null
  }
  try {
    const parsed =
      typeof decomposition === 'string'
        ? JSON.parse(decomposition)
        : decomposition
    return decompositionOutputSchema.parse(parsed)
  } catch {
    return null
  }
}
