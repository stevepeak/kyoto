import { execa } from 'execa'

let cachedGitRoot: string | null = null

/**
 * Finds the git repository root directory.
 * Caches the result for performance.
 *
 * @returns The absolute path to the git repository root
 * @throws {Error} If git root cannot be determined
 */
export async function findGitRoot(): Promise<string> {
  if (cachedGitRoot) {
    return cachedGitRoot
  }

  try {
    // Use git to find the project root
    const { stdout } = await execa('git', ['rev-parse', '--show-toplevel'], {
      cwd: process.cwd(),
    })
    const gitRoot = stdout.trim()
    cachedGitRoot = gitRoot
    return gitRoot
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(
        `Git not found. Please ensure git is installed and you're in a git repository.`,
      )
    }
    if (
      error instanceof Error &&
      error.message.includes('not a git repository')
    ) {
      throw new Error(
        `Not a git repository. Please run this command from within a git repository.`,
      )
    }
    throw new Error(
      `Failed to find git root: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
