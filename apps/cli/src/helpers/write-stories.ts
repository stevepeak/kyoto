import { mkdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { writeLocalFile } from '@app/shell'
import type { DiscoveryAgentOutput } from '@app/schemas'
import { findKyotoDir, findGitRoot } from './find-kyoto-dir.js'

/**
 * Writes story objects to JSON files in the `.kyoto` directory.
 * Creates safe filenames from story titles and ensures the output directory exists.
 *
 * @param stories - Array of story objects to write to files
 * @returns Array of file paths that were written
 * @throws {Error} If writing any story file fails
 */
export async function writeStoriesToFiles(
  stories: DiscoveryAgentOutput,
): Promise<string[]> {
  const kyotoDir = await findKyotoDir()
  const gitRoot = await findGitRoot()
  const writtenFiles: string[] = []

  for (const story of stories) {
    // Create a safe filename from the story title
    const safeTitle = story.title
      .toLowerCase()
      .replace(/[^\da-z]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100) // Limit length

    const storyPath = join(kyotoDir, `${safeTitle}.json`)
    const json = JSON.stringify(story, null, 2)

    try {
      // Ensure .kyoto directory exists
      await mkdir(kyotoDir, { recursive: true })

      // Calculate relative path from git root to the story file
      const relativePath = relative(gitRoot, storyPath)
      await writeLocalFile(relativePath, json)
      writtenFiles.push(relativePath)
    } catch (error) {
      throw new Error(
        `Failed to write story file ${storyPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  return writtenFiles
}
