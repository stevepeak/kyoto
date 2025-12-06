import { compositionAgentOutputSchema } from '@app/schemas'
import type { CompositionAgentOutput } from '@app/schemas'

/**
 * Parses composition data from unknown format (string or object)
 * and validates it against the composition schema
 */
export function parseDecomposition(
  decomposition: unknown,
): CompositionAgentOutput | null {
  if (!decomposition) {
    return null
  }
  try {
    const parsed =
      typeof decomposition === 'string'
        ? JSON.parse(decomposition)
        : decomposition
    return compositionAgentOutputSchema.parse(parsed)
  } catch {
    return null
  }
}
