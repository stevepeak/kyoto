import { execa } from 'execa'

export interface CommitInfo {
  hash: string // Full hash
  shortHash: string // Short hash (6 chars)
  message: string
}

/**
 * Gets the latest commit information from the git repository.
 *
 * @param gitRoot - The git repository root directory
 * @returns Commit information or null if no commit found
 */
export async function getLatestCommit(
  gitRoot: string,
): Promise<CommitInfo | null> {
  try {
    const { stdout } = await execa('git', ['log', '-1', '--format=%H|%s'], {
      cwd: gitRoot,
    })

    if (!stdout.trim()) {
      return null
    }

    const [hash, ...messageParts] = stdout.trim().split('|')
    const message = messageParts.join('|') // Rejoin in case message contains |

    return {
      hash, // Full hash
      shortHash: hash.substring(0, 6), // Short hash (6 chars)
      message: message.trim(),
    }
  } catch {
    return null
  }
}

/**
 * Gets the current commit SHA from git
 *
 * @param gitRoot - The git repository root directory
 * @returns The commit SHA or null if not found
 */
export async function getCurrentCommitSha(
  gitRoot: string,
): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['log', '-1', '--format=%H'], {
      cwd: gitRoot,
    })
    return stdout.trim() || null
  } catch {
    return null
  }
}
