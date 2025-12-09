import { type DiscoveredStory, discoveredStorySchema } from '@app/schemas'
import { findGitRoot } from '@app/shell'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { pwdKyoto } from '../config/find-kyoto-dir'

interface StoryFile {
  path: string
  filename: string
  story: DiscoveredStory
}

/**
 * Reads all story markdown files from the .kyoto/stories directory
 * and merges them with their corresponding artifact JSON files.
 *
 * @returns Array of story files with their paths and parsed content
 * @throws {Error} If the .kyoto/stories directory doesn't exist or can't be read
 */
export async function readAllStoryFiles(): Promise<StoryFile[]> {
  const gitRoot = await findGitRoot()
  const { stories: storiesDir, artifacts: artifactsDir } =
    await pwdKyoto(gitRoot)
  const storiesRelativePath = relative(gitRoot, storiesDir)

  try {
    const files = await readdir(storiesDir)
    const storyMdFiles = files.filter((file) => file.endsWith('.story.md'))

    const storyFiles: StoryFile[] = []

    for (const filename of storyMdFiles) {
      const storyMdPath = join(storiesDir, filename)
      const behaviorContent = await readFile(storyMdPath, 'utf-8')

      // Extract base filename (without .story.md extension)
      const baseFilename = filename.replace(/\.story\.md$/, '')
      const artifactPath = join(artifactsDir, `${baseFilename}.json`)

      // Try to read artifact file, but it's optional
      let artifactData: Record<string, unknown> = {}
      try {
        const artifactContent = await readFile(artifactPath, 'utf-8')
        artifactData = JSON.parse(artifactContent)
      } catch {
        // Artifact file doesn't exist or is invalid, continue with empty data
      }

      // Merge behavior with artifact data
      const storyData: Record<string, unknown> = {
        title: (artifactData.title as string) || baseFilename,
        behavior: behaviorContent,
        dependencies: artifactData.dependencies ?? null,
        acceptanceCriteria: artifactData.acceptanceCriteria ?? [],
        assumptions: artifactData.assumptions ?? [],
        codeReferences: artifactData.codeReferences ?? [],
      }

      if (artifactData.composition !== undefined) {
        storyData.composition = artifactData.composition
      }

      const story = discoveredStorySchema.parse(storyData)

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
