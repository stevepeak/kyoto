import { LocalIndex } from 'vectra';
import type { IndexItem } from 'vectra';
import type { VectraItem } from './types.js';

/**
 * Inserts an item into the index
 */
export async function insert<T = Record<string, unknown>>(
  index: LocalIndex,
  item: VectraItem,
): Promise<IndexItem<T>> {
  return await index.insertItem<T>({
    vector: item.vector,
    metadata: item.metadata as T,
    id: item.id,
  });
}

