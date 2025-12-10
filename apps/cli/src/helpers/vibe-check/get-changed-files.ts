import { getStagedTsFiles, getUnstagedTsFiles } from '@app/shell'

/**
 * Determines which TypeScript files to check based on staged/unstaged status.
 *
 * @returns Array of changed TypeScript file paths
 */
export async function getChangedFiles(args: {
  staged: boolean
  gitRoot: string
}): Promise<string[]> {
  const { staged, gitRoot } = args

  if (staged) {
    // Only check staged changes
    return await getStagedTsFiles(gitRoot)
  } else {
    // Check all changes (staged + unstaged)
    const stagedFiles = await getStagedTsFiles(gitRoot)
    const unstagedFiles = await getUnstagedTsFiles(gitRoot)
    // Combine and deduplicate
    const allFiles = new Set([...stagedFiles, ...unstagedFiles])
    return Array.from(allFiles)
  }
}
