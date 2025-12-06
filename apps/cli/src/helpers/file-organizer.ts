import { mkdir, access, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { constants } from 'node:fs'
import { pwdKyoto } from './find-kyoto-dir.js'

/**
 * Creates a directory within the .kyoto/stories folder.
 *
 * @param relativePath - Path relative to .kyoto/stories (e.g., "users/preference")
 */
export async function createStoryDirectory(
  relativePath: string,
): Promise<void> {
  const { stories: storiesDir } = await pwdKyoto()
  const fullPath = join(storiesDir, relativePath)
  try {
    await access(fullPath, constants.F_OK)
    // Directory already exists, skip creation
    return
  } catch {
    // Directory doesn't exist, create it
    await mkdir(fullPath, { recursive: true })
  }
}

/**
 * Deletes a story file from the .kyoto/stories directory.
 *
 * @param relativePath - Path relative to .kyoto/stories (e.g., "filename.json" or "users/preference/filename.json")
 * @throws {Error} If the file cannot be deleted
 */
export async function deleteStoryFile(relativePath: string): Promise<void> {
  const { stories: storiesDir } = await pwdKyoto()
  const fullPath = join(storiesDir, relativePath)

  try {
    await unlink(fullPath)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File doesn't exist, which is fine
      return
    }
    throw new Error(
      `Failed to delete story file ${relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
