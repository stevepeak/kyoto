import { execa } from 'execa'

/**
 * Gets changed TypeScript files from a commit using git.
 *
 * @param commitSha - The commit SHA to check
 * @param gitRoot - The git repository root directory
 * @returns Array of changed TypeScript file paths
 */
export async function getChangedTsFiles(
  commitSha: string,
  gitRoot: string,
): Promise<string[]> {
  try {
    const { stdout } = await execa(
      'git',
      ['show', '--name-only', '--format=', commitSha],
      {
        cwd: gitRoot,
      },
    )

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 && (line.endsWith('.ts') || line.endsWith('.tsx')),
      )
  } catch {
    return []
  }
}
