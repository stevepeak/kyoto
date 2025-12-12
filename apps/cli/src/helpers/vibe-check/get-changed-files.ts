import {
  getChangedTsFiles,
  getChangedTsFilesFromCommits,
  getStagedTsFiles,
  getUnstagedTsFiles,
} from '@app/shell'
import { type VibeCheckScope } from '@app/types'

/**
 * Determines which TypeScript files to check based on the scope.
 *
 * @returns Array of changed TypeScript file paths
 */
export async function getChangedFiles(args: {
  scope: VibeCheckScope
  gitRoot: string
}): Promise<string[]> {
  const { scope, gitRoot } = args

  switch (scope.type) {
    case 'commit':
      return await getChangedTsFiles(scope.commit, gitRoot)
    case 'commits':
      return await getChangedTsFilesFromCommits(scope.commits, gitRoot)
    case 'staged':
      return await getStagedTsFiles(gitRoot)
    case 'unstaged': {
      // Check all changes (staged + unstaged)
      const stagedFiles = await getStagedTsFiles(gitRoot)
      const unstagedFiles = await getUnstagedTsFiles(gitRoot)
      // Combine and deduplicate
      const allFiles = new Set([...stagedFiles, ...unstagedFiles])
      return Array.from(allFiles)
    }
    case 'paths':
      // Filter to only TypeScript files
      return scope.paths.filter(
        (path) => path.endsWith('.ts') || path.endsWith('.tsx'),
      )
  }
}
