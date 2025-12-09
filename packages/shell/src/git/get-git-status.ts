import { execa } from 'execa'

/**
 * Checks if the git branch is clean (no uncommitted changes)
 *
 * @param gitRoot - The git repository root directory
 * @returns true if branch is clean, false otherwise
 */
export async function isBranchClean(gitRoot: string): Promise<boolean> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain'], {
      cwd: gitRoot,
    })
    return stdout.trim().length === 0
  } catch {
    return false
  }
}

/**
 * Checks if there are staged changes
 *
 * @param gitRoot - The git repository root directory
 * @returns true if there are staged changes, false otherwise
 */
export async function hasStagedChanges(gitRoot: string): Promise<boolean> {
  try {
    const { stdout } = await execa('git', ['diff', '--cached', '--name-only'], {
      cwd: gitRoot,
    })
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

/**
 * Checks if there are any changes (staged or unstaged)
 *
 * @param gitRoot - The git repository root directory
 * @returns true if there are any changes, false otherwise
 */
export async function hasChanges(gitRoot: string): Promise<boolean> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain'], {
      cwd: gitRoot,
    })
    return stdout.trim().length > 0
  } catch {
    return false
  }
}
