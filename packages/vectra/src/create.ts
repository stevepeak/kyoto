import { LocalIndex } from 'vectra';

/**
 * Creates a new VectraIndex instance
 */
export function createIndex(indexPath: string): LocalIndex {
  return new LocalIndex(indexPath);
}

/**
 * Creates the index if it doesn't exist
 */
export async function createDb(index: LocalIndex): Promise<void> {
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
  }
}

/**
 * Checks if the index exists and creates it if needed
 */
export async function ensureIndex(index: LocalIndex): Promise<void> {
  await createDb(index);
}

