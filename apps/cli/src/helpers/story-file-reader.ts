import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findKyotoDir } from './find-kyoto-dir.js'
import { DiscoveredStory, discoveredStorySchema } from '@app/schemas'

export interface StoryFile {
  path: string
  filename: string
  story: DiscoveredStory
}

const STORIES_DIR = '.kyoto'

/**
 * Reads all story JSON files from the .kyoto directory.
 *
 * @returns Array of story files with their paths and parsed content
 * @throws {Error} If the .kyoto directory doesn't exist or can't be read
 */
export async function readAllStoryFiles(): Promise<StoryFile[]> {
  const storiesDir = await findKyotoDir()

  try {
    const files = await readdir(storiesDir)
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    const storyFiles: StoryFile[] = []

    for (const filename of jsonFiles) {
      const filePath = join(storiesDir, filename)
      const content = await readFile(filePath, 'utf-8')
      const story = discoveredStorySchema.parse(JSON.parse(content))

      storyFiles.push({
        path: join(STORIES_DIR, filename),
        filename,
        story,
      })
    }

    return storyFiles
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`.kyoto directory not found: ${STORIES_DIR}`)
    }
    throw error
  }
}

/**
 * Recursively reads all story JSON files from the .kyoto directory and all subdirectories.
 *
 * @param folderPath - Optional folder path within .kyoto to scan (relative to .kyoto)
 * @returns Array of story files with their paths and parsed content
 * @throws {Error} If the .kyoto directory doesn't exist or can't be read
 */
export async function readAllStoryFilesRecursively(
  folderPath?: string,
): Promise<StoryFile[]> {
  const kyotoDir = await findKyotoDir()
  const baseDir = folderPath ? join(kyotoDir, folderPath) : kyotoDir

  const storyFiles: StoryFile[] = []

  async function walkDir(
    currentPath: string,
    relativeBase: string,
  ): Promise<void> {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name)

        if (entry.isDirectory()) {
          // Recursively walk subdirectories
          const newRelativeBase = relativeBase
            ? join(relativeBase, entry.name)
            : entry.name
          await walkDir(fullPath, newRelativeBase)
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          // Read and parse JSON story file
          try {
            const content = await readFile(fullPath, 'utf-8')
            const story = discoveredStorySchema.parse(JSON.parse(content))

            const relativePath = relativeBase
              ? join(STORIES_DIR, relativeBase, entry.name)
              : join(STORIES_DIR, entry.name)

            storyFiles.push({
              path: relativePath,
              filename: entry.name,
              story,
            })
          } catch (parseError) {
            // Skip files that can't be parsed
            continue
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read (e.g., permission denied)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        throw new Error(
          folderPath
            ? `.kyoto directory not found: ${STORIES_DIR}/${folderPath}`
            : `.kyoto directory not found: ${STORIES_DIR}`,
        )
      }
      // Continue processing other directories
    }
  }

  await walkDir(baseDir, folderPath || '')
  return storyFiles
}
