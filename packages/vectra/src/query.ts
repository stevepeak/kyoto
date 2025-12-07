import { type LocalIndex, type QueryResult } from 'vectra'

import { type VectraQueryOptions } from './types.js'

/**
 * Queries the index for similar items
 */
export async function query<T = Record<string, unknown>>(
  index: LocalIndex,
  vector: number[],
  options: VectraQueryOptions = {},
): Promise<QueryResult<T>[]> {
  const { topK = 3, filter, threshold } = options
  const results = await index.queryItems<T>(vector, topK, filter)

  // Filter by threshold if provided
  if (threshold !== undefined) {
    return results.filter((result) => result.score >= threshold)
  }

  return results
}
