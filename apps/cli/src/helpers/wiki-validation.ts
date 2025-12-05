import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readAllStoryFiles, readAllStoryFilesRecursively } from './story-file-reader.js'

const STORIES_DIR = '.stories'

/**
 * Validates that stories are organized in a folder structure:
 * - At least one story file exists in a subfolder (not at root)
 * - No story files exist at .stories/ root level
 *
 * @throws {Error} If validation fails with a descriptive message
 */
export async function validateStoryStructure(): Promise<void> {
  const storiesDir = resolve(process.cwd(), STORIES_DIR)

  try {
    // Check if .stories directory exists
    await readdir(storiesDir)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(
        `Stories directory not found: ${STORIES_DIR}\n\nPlease ensure you have story files organized in folders.`,
      )
    }
    throw error
  }

  // Check for story files at root level
  const rootStoryFiles = await readAllStoryFiles()
  if (rootStoryFiles.length > 0) {
    throw new Error(
      `Found ${rootStoryFiles.length} story file(s) at the root of .stories/\n\n` +
        `All story files must be organized in subfolders. Please move these files:\n` +
        rootStoryFiles.map((f) => `  - ${f.filename}`).join('\n'),
    )
  }

  // Check that at least one story exists in a subfolder
  const allStoryFiles = await readAllStoryFilesRecursively()
  if (allStoryFiles.length === 0) {
    throw new Error(
      `No story files found in any subfolder of .stories/\n\n` +
        `Please ensure you have at least one story file organized in a folder structure.`,
    )
  }

  // Verify that all stories are in subfolders (not at root)
  const storiesInSubfolders = allStoryFiles.filter((file) => {
    const relativePath = file.path.replace(`${STORIES_DIR}/`, '')
    return relativePath.includes('/')
  })

  if (storiesInSubfolders.length === 0) {
    throw new Error(
      `No story files found in subfolders.\n\n` +
        `All story files must be organized in subfolders, not at the root of .stories/`,
    )
  }
}

