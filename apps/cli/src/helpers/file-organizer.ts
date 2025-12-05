import { mkdir, access, unlink } from 'node:fs/promises'
import { resolve, join, dirname } from 'node:path'
import { rename } from 'node:fs/promises'
import { constants } from 'node:fs'

const STORIES_DIR = '.stories'

/**
 * Creates a directory within the .stories folder.
 *
 * @param relativePath - Path relative to .stories (e.g., "users/preference")
 */
export async function createStoryDirectory(
  relativePath: string,
): Promise<void> {
  const fullPath = resolve(process.cwd(), STORIES_DIR, relativePath)
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
 * Moves a story file to a new location within .stories.
 *
 * @param fromPath - Current path relative to .stories (e.g., "filename.json")
 * @param toPath - Target path relative to .stories (e.g., "users/preference/filename.json")
 */
export async function moveStoryFile(
  fromPath: string,
  toPath: string,
): Promise<void> {
  const fromFullPath = resolve(process.cwd(), STORIES_DIR, fromPath)
  const toFullPath = resolve(process.cwd(), STORIES_DIR, toPath)
  const toDir = dirname(toFullPath)

  // Ensure destination directory exists
  await mkdir(toDir, { recursive: true })

  // Move the file
  await rename(fromFullPath, toFullPath)
}

/**
 * Gets the full path for a story file relative to .stories.
 *
 * @param relativePath - Path relative to .stories
 * @returns Full absolute path
 */
export function getStoryFilePath(relativePath: string): string {
  return resolve(process.cwd(), STORIES_DIR, relativePath)
}

/**
 * Deletes a story file from the .stories directory.
 *
 * @param relativePath - Path relative to .stories (e.g., "filename.json" or "users/preference/filename.json")
 * @throws {Error} If the file cannot be deleted
 */
export async function deleteStoryFile(relativePath: string): Promise<void> {
  const fullPath = resolve(process.cwd(), STORIES_DIR, relativePath)

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
