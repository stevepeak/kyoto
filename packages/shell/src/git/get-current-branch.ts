import { execa } from 'execa'

/**
 * Gets the current branch name from git.
 *
 * @param gitRoot - The git repository root directory
 * @returns The current branch name or null if unable to determine
 */
export async function getCurrentBranch(
  gitRoot: string,
): Promise<string | null> {
  try {
    const { stdout } = await execa(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      {
        cwd: gitRoot,
      },
    )
    return stdout.trim() || null
  } catch {
    return null
  }
}

