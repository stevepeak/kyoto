import { access } from 'node:fs/promises'
import path from 'node:path'

import { runGit } from './run-git'

/**
 * Gets the path to the git index.lock file for a repository.
 * Handles worktrees/submodules where `.git` may be a file.
 *
 * @param args.gitRoot - The git repository root directory
 * @returns The path to index.lock, or null if git directory couldn't be determined
 */
export async function getGitIndexLockPath(args: {
  gitRoot: string
}): Promise<string | null> {
  const { gitRoot } = args

  // Worktrees/submodules may have `.git` as a file; `--git-dir` is the reliable way.
  const { stdout } = await runGit({
    gitRoot,
    args: ['rev-parse', '--git-dir'],
  })

  const gitDir = stdout.trim()
  if (gitDir.length === 0) {
    return null
  }

  const resolvedGitDir = path.isAbsolute(gitDir)
    ? gitDir
    : path.join(gitRoot, gitDir)
  return path.join(resolvedGitDir, 'index.lock')
}

/**
 * Asserts that no git index lock exists, throwing an error if one is found.
 * This is useful before performing git operations to prevent conflicts.
 *
 * @param args.gitRoot - The git repository root directory
 * @throws Error if a git index lock file exists
 */
export async function assertNoGitIndexLock(args: {
  gitRoot: string
}): Promise<void> {
  const lockPath = await getGitIndexLockPath({ gitRoot: args.gitRoot })
  if (!lockPath) {
    return
  }

  try {
    await access(lockPath)
  } catch {
    return
  }

  throw new Error(
    [
      `Git index is locked (found: ${lockPath}).`,
      'Another git process is likely still running (or a previous one crashed).',
      'Close any editor opened by git and stop any running git commands, then retry.',
      `If you are sure nothing is running, remove the lock file: rm -f "${lockPath}"`,
    ].join('\n'),
  )
}

/**
 * Gets all changed files (staged and unstaged) from git status.
 * Handles renames, copies, and files with special characters.
 *
 * @param args.gitRoot - The git repository root directory
 * @returns A Set of file paths that have changes
 */
export async function getAllChangedFiles(args: {
  gitRoot: string
}): Promise<Set<string>> {
  try {
    // Use -z for robust parsing (handles spaces, renames, etc.)
    const { stdout } = await runGit({
      gitRoot: args.gitRoot,
      args: ['status', '--porcelain', '-z'],
    })
    const files = new Set<string>()
    const tokens = stdout.split('\0').filter((t) => t.length > 0)
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (!token || token.length < 4) {
        continue
      }

      const status = token.slice(0, 2)
      const pathA = token.slice(3)
      if (pathA.length > 0) {
        files.add(pathA)
      }

      // Renames/copies include a second path as the next NUL-delimited token.
      const isRenameOrCopy = status.includes('R') || status.includes('C')
      if (isRenameOrCopy) {
        const pathB = tokens[i + 1]
        if (pathB && pathB.length > 0) {
          files.add(pathB)
          i++
        }
      }
    }
    return files
  } catch {
    return new Set()
  }
}
