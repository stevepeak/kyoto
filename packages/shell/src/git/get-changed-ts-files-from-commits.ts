import { execa } from 'execa'

/**
 * Gets changed TypeScript files from multiple commits.
 * Returns unique file paths across all commits.
 *
 * @param commitShas - Array of commit SHAs to check
 * @param gitRoot - The git repository root directory
 * @returns Array of unique changed TypeScript file paths
 */
export async function getChangedTsFilesFromCommits(
  commitShas: string[],
  gitRoot: string,
): Promise<string[]> {
  if (commitShas.length === 0) {
    return []
  }

  const allFiles = new Set<string>()

  for (const commitSha of commitShas) {
    try {
      const { stdout } = await execa(
        'git',
        ['show', '--name-only', '--format=', commitSha],
        {
          cwd: gitRoot,
        },
      )

      const files = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(
          (line) =>
            line.length > 0 && (line.endsWith('.ts') || line.endsWith('.tsx')),
        )

      for (const file of files) {
        allFiles.add(file)
      }
    } catch {
      // Continue with other commits if one fails
    }
  }

  return Array.from(allFiles)
}
