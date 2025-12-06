import { mkdir, access, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { rename } from 'node:fs/promises'
import { constants } from 'node:fs'
import { findKyotoDir } from './find-kyoto-dir.js'

/**
 * Creates a directory within the .kyoto folder.
 *
 * @param relativePath - Path relative to .kyoto (e.g., "users/preference")
 */
export async function createStoryDirectory(
  relativePath: string,
): Promise<void> {
  const kyotoDir = await findKyotoDir()
  const fullPath = join(kyotoDir, relativePath)
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
 * Moves a story file to a new location within .kyoto.
 *
 * @param fromPath - Current path relative to .kyoto (e.g., "filename.json")
 * @param toPath - Target path relative to .kyoto (e.g., "users/preference/filename.json")
 */
export async function moveStoryFile(
  fromPath: string,
  toPath: string,
): Promise<void> {
  const kyotoDir = await findKyotoDir()
  const fromFullPath = join(kyotoDir, fromPath)
  const toFullPath = join(kyotoDir, toPath)
  const toDir = dirname(toFullPath)

  // Ensure destination directory exists
  await mkdir(toDir, { recursive: true })

  // Move the file
  await rename(fromFullPath, toFullPath)
}

/**
 * Gets the full path for a story file relative to .kyoto.
 *
 * @param relativePath - Path relative to .kyoto
 * @returns Full absolute path
 */
export async function getStoryFilePath(relativePath: string): Promise<string> {
  const kyotoDir = await findKyotoDir()
  return join(kyotoDir, relativePath)
}

/**
 * Deletes a story file from the .kyoto directory.
 *
 * @param relativePath - Path relative to .kyoto (e.g., "filename.json" or "users/preference/filename.json")
 * @throws {Error} If the file cannot be deleted
 */
export async function deleteStoryFile(relativePath: string): Promise<void> {
  const kyotoDir = await findKyotoDir()
  const fullPath = join(kyotoDir, relativePath)

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
