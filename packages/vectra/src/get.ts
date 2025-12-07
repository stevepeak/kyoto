import { LocalIndex } from 'vectra';
import type { IndexItem } from 'vectra';

/**
 * Gets an item from the index by ID
 */
export async function getItem<T = Record<string, unknown>>(
  index: LocalIndex,
  itemId: string,
): Promise<IndexItem<T> | undefined> {
  return await index.getItem<T>(itemId);
}

