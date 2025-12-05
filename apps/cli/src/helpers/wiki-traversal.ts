import { readdir, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import type { StoryFile } from './story-file-reader.js'
import { readAllStoryFilesRecursively } from './story-file-reader.js'

const STORIES_DIR = '.stories'

export interface FolderInfo {
  path: string // Relative path from .stories (e.g., "api/webhooks/github")
  fullPath: string // Absolute path
  depth: number // Depth level (0 = root, 1 = first level, etc.)
}

/**
 * Gets all folders in the .stories directory hierarchy, sorted by depth (deepest first).
 * This ensures we process folders bottom-up.
 */
export async function getFolderHierarchy(): Promise<FolderInfo[]> {
  const storiesDir = resolve(process.cwd(), STORIES_DIR)
  const folders: FolderInfo[] = []

  async function walkDir(
    currentPath: string,
    relativePath: string,
    depth: number,
  ): Promise<void> {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = join(currentPath, entry.name)
          const newRelativePath = relativePath
            ? join(relativePath, entry.name)
            : entry.name

          folders.push({
            path: newRelativePath,
            fullPath,
            depth: depth + 1,
          })

          // Recursively walk subdirectories
          await walkDir(fullPath, newRelativePath, depth + 1)
        }
      }
    } catch (error) {
      // Skip directories that can't be read
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        throw new Error(`Stories directory not found: ${STORIES_DIR}`)
      }
    }
  }

  await walkDir(storiesDir, '', -1)

  // Sort by depth descending (deepest first) for bottom-up processing
  return folders.sort((a, b) => b.depth - a.depth)
}

/**
 * Gets all story files in a specific folder.
 * @param folderPath - Relative path from .stories (e.g., "api/webhooks/github")
 * @returns Array of story files in that folder
 */
export async function getStoriesInFolder(
  folderPath: string,
): Promise<StoryFile[]> {
  const allStories = await readAllStoryFilesRecursively(folderPath)

  // Filter to only stories that are directly in this folder (not in subfolders)
  const folderStories = allStories.filter((story) => {
    // Remove .stories/ prefix
    const relativePath = story.path.replace(`${STORIES_DIR}/`, '')
    // Remove filename
    const storyFolder = relativePath.substring(0, relativePath.lastIndexOf('/'))
    // Check if it matches the target folder
    return storyFolder === folderPath
  })

  return folderStories
}

/**
 * Checks if a folder contains any story files (not just subfolders).
 */
export async function folderHasStories(folderPath: string): Promise<boolean> {
  const stories = await getStoriesInFolder(folderPath)
  return stories.length > 0
}

