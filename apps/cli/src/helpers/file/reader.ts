import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { findGitRoot } from '@app/shell'
import { pwdKyoto } from '../config/find-kyoto-dir.js'
import type { DiscoveredStory } from '@app/schemas'
import { discoveredStorySchema } from '@app/schemas'

export interface StoryFile {
  path: string
  filename: string
  story: DiscoveredStory
}

/**
 * Reads all story JSON files from the .kyoto/stories directory.
 *
 * @returns Array of story files with their paths and parsed content
 * @throws {Error} If the .kyoto/stories directory doesn't exist or can't be read
 */
export async function readAllStoryFiles(): Promise<StoryFile[]> {
  const { stories: storiesDir } = await pwdKyoto()
  const gitRoot = await findGitRoot()
  const storiesRelativePath = relative(gitRoot, storiesDir)

  try {
    const files = await readdir(storiesDir)
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    const storyFiles: StoryFile[] = []

    for (const filename of jsonFiles) {
      const filePath = join(storiesDir, filename)
      const content = await readFile(filePath, 'utf-8')
      const story = discoveredStorySchema.parse(JSON.parse(content))

      storyFiles.push({
        path: join(storiesRelativePath, filename),
        filename,
        story,
      })
    }

    return storyFiles
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(
        `.kyoto/stories directory not found: ${storiesRelativePath}`,
      )
    }
    throw error
  }
}

