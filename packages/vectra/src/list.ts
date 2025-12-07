import { type IndexItem, type LocalIndex } from 'vectra'

/**
 * Lists all items in the index
 */
export async function listItems<T = Record<string, unknown>>(
  index: LocalIndex,
): Promise<IndexItem<T>[]> {
  return await index.listItems<T>()
}
