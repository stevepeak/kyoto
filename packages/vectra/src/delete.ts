import { type LocalIndex } from 'vectra'

/**
 * Deletes an item from the index by ID
 */
export async function deleteItem(
  index: LocalIndex,
  itemId: string,
): Promise<void> {
  await index.deleteItem(itemId)
}

/**
 * Deletes all items from the index
 */
export async function deleteAll(index: LocalIndex): Promise<void> {
  await index.deleteIndex()
  await index.createIndex()
}
