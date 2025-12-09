import { execa } from 'execa'

import { type CommitInfo } from './get-latest-commit'

/**
 * Gets recent commits from the git repository.
 *
 * @param limit - The number of recent commits to retrieve
 * @param gitRoot - The git repository root directory
 * @returns Array of commit information
 */
export async function getRecentCommits(
  limit: number,
  gitRoot: string,
): Promise<CommitInfo[]> {
  try {
    const { stdout } = await execa(
      'git',
      ['log', `-${limit}`, '--format=%H|%s'],
      {
        cwd: gitRoot,
      },
    )

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [hash, ...messageParts] = line.split('|')
        const message = messageParts.join('|')
        return {
          hash,
          shortHash: hash.substring(0, 6),
          message: message.trim(),
        }
      })
  } catch {
    return []
  }
}
