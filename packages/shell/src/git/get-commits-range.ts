import { execa } from 'execa'

import { type CommitInfo } from './get-latest-commit'

/**
 * Gets commits in a range (from one commit to another).
 *
 * @param fromSha - The starting commit SHA (exclusive)
 * @param toSha - The ending commit SHA (inclusive)
 * @param gitRoot - The git repository root directory
 * @returns Array of commit information
 */
export async function getCommitsRange(
  fromSha: string,
  toSha: string,
  gitRoot: string,
): Promise<CommitInfo[]> {
  try {
    const { stdout } = await execa(
      'git',
      ['log', `${fromSha}..${toSha}`, '--format=%H|%s'],
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
