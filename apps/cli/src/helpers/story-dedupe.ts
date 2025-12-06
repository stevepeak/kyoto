import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { StoryFile } from './story-file-reader.js'
import { groupDuplicates } from './story-similarity.js'
import { pwdKyoto } from './find-kyoto-dir.js'

/**
 * Selects the story file to keep from a group of duplicates.
 * Keeps the oldest file (by modification time), or first alphabetically if times are equal.
 *
 * @param group - Array of duplicate story files
 * @returns The story file to keep
 */
async function selectStoryToKeep(group: StoryFile[]): Promise<StoryFile> {
  if (group.length === 0) {
    throw new Error('Cannot select from empty group')
  }

  if (group.length === 1) {
    return group[0]!
  }

  const { stories: storiesDir } = await pwdKyoto()

  // Get modification times for all files
  const fileStats = await Promise.all(
    group.map(async (file) => {
      // file.path is relative to git root (e.g., ".kyoto/stories/folder/file.json")
      // Remove the .kyoto/stories/ prefix to get the relative path within stories
      const relativePath = file.path.replace(/^\.kyoto\/stories\//, '')
      const fullPath = join(storiesDir, relativePath)
      try {
        const stats = await stat(fullPath)
        return {
          file,
          mtime: stats.mtime.getTime(),
        }
      } catch {
        // If we can't get stats, use current time (newest)
        return {
          file,
          mtime: Date.now(),
        }
      }
    }),
  )

  // Sort by modification time (oldest first), then by filename
  fileStats.sort((a, b) => {
    if (a.mtime !== b.mtime) {
      return a.mtime - b.mtime
    }
    return a.file.filename.localeCompare(b.file.filename)
  })

  // Return the oldest file
  return fileStats[0]!.file
}

/**
 * Finds duplicate stories and determines which files to delete.
 *
 * @param stories - Array of story files to check for duplicates
 * @param threshold - Similarity threshold (0-1)
 * @param onProgress - Optional progress callback
 * @returns Object containing duplicate groups and files to delete
 */
export async function findDuplicates(
  stories: StoryFile[],
  threshold: number,
  onProgress?: (message: string) => void,
): Promise<{ groups: Array<StoryFile[]>; toDelete: StoryFile[] }> {
  if (stories.length === 0) {
    return { groups: [], toDelete: [] }
  }

  // Group duplicates
  const groups = await groupDuplicates(stories, threshold, onProgress)

  // For each group, select one to keep and mark others for deletion
  const toDelete: StoryFile[] = []

  for (const group of groups) {
    try {
      const toKeep = await selectStoryToKeep(group)
      const duplicates = group.filter((file) => file.path !== toKeep.path)
      toDelete.push(...duplicates)
    } catch (error) {
      // Skip group if selection fails
      continue
    }
  }

  return { groups, toDelete }
}
