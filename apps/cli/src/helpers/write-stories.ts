import { mkdir } from 'node:fs/promises'
import { writeLocalFile } from '../tools/local-write-file-tool.js'
import type { Story } from './story-generator-agent.js'

/**
 * Writes story objects to JSON files in the `.stories` directory.
 * Creates safe filenames from story titles and ensures the output directory exists.
 *
 * @param stories - Array of story objects to write to files
 * @returns Array of file paths that were written
 * @throws {Error} If writing any story file fails
 */
export async function writeStoriesToFiles(stories: Story[]): Promise<string[]> {
  const writtenFiles: string[] = []

  for (const story of stories) {
    // Create a safe filename from the story title
    const safeTitle = story.title
      .toLowerCase()
      .replace(/[^\da-z]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100) // Limit length

    const storyPath = `.stories/${safeTitle}.json`
    const json = JSON.stringify(story, null, 2)

    try {
      // Ensure .stories directory exists
      await mkdir('.stories', { recursive: true })

      // Write the story file
      await writeLocalFile(storyPath, json)
      writtenFiles.push(storyPath)
    } catch (error) {
      throw new Error(
        `Failed to write story file ${storyPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  return writtenFiles
}
