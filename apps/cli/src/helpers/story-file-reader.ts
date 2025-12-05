import { readdir, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import type { Story } from './story-generator-agent.js'

export interface StoryFile {
  path: string
  filename: string
  story: Story
}

const STORIES_DIR = '.stories'

/**
 * Reads all story JSON files from the .stories directory.
 *
 * @returns Array of story files with their paths and parsed content
 * @throws {Error} If the .stories directory doesn't exist or can't be read
 */
export async function readAllStoryFiles(): Promise<StoryFile[]> {
  const storiesDir = resolve(process.cwd(), STORIES_DIR)

  try {
    const files = await readdir(storiesDir)
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    const storyFiles: StoryFile[] = []

    for (const filename of jsonFiles) {
      const filePath = join(storiesDir, filename)
      const content = await readFile(filePath, 'utf-8')
      const story = JSON.parse(content) as Story

      storyFiles.push({
        path: join(STORIES_DIR, filename),
        filename,
        story,
      })
    }

    return storyFiles
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Stories directory not found: ${STORIES_DIR}`)
    }
    throw error
  }
}

/**
 * Recursively reads all story JSON files from the .stories directory and all subdirectories.
 *
 * @param folderPath - Optional folder path within .stories to scan (relative to .stories)
 * @returns Array of story files with their paths and parsed content
 * @throws {Error} If the .stories directory doesn't exist or can't be read
 */
export async function readAllStoryFilesRecursively(
  folderPath?: string,
): Promise<StoryFile[]> {
  const baseDir = folderPath
    ? resolve(process.cwd(), STORIES_DIR, folderPath)
    : resolve(process.cwd(), STORIES_DIR)

  const storyFiles: StoryFile[] = []

  async function walkDir(currentPath: string, relativeBase: string): Promise<void> {
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
            const story = JSON.parse(content) as Story

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
            ? `Stories directory not found: ${STORIES_DIR}/${folderPath}`
            : `Stories directory not found: ${STORIES_DIR}`,
        )
      }
      // Continue processing other directories
    }
  }

  await walkDir(baseDir, folderPath || '')
  return storyFiles
}

