import { access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { execa } from 'execa'

const KYOTO_DIR = '.kyoto'

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
    if (error instanceof Error && error.message.includes('not a git repository')) {
      throw new Error(
        `Not a git repository. Please run this command from within a git repository.`,
      )
    }
    throw new Error(
      `Failed to find git root: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

interface KyotoPaths {
  root: string
  stories: string
  details: string
}

/**
 * Finds the .kyoto directory paths by using git to find the project root.
 * This allows the CLI to work regardless of where it's invoked from.
 *
 * @returns An object with absolute paths to .kyoto root, stories, and details.json
 * @throws {Error} If the .kyoto directory cannot be found or git root cannot be determined
 */
export async function pwdKyoto(): Promise<KyotoPaths> {
  const gitRoot = await findGitRoot()
  const root = join(gitRoot, KYOTO_DIR)
  const stories = join(root, 'stories')
  const details = join(root, 'details.json')

  // Verify the .kyoto directory exists
  try {
    await access(root, constants.F_OK)
    return { root, stories, details }
  } catch {
    throw new Error(`.kyoto directory not found: ${KYOTO_DIR}`)
  }
}

