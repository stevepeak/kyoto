import { execa } from 'execa'

import { type CommitInfo } from './get-latest-commit'

/**
 * Gets all commits in a pull request by comparing base and head branches.
 * This is useful for GitHub Actions PR events.
 *
 * @param baseRef - The base branch (e.g., 'main')
 * @param headRef - The head branch (e.g., 'feature-branch')
 * @param gitRoot - The git repository root directory
 * @returns Array of commit information
 */
export async function getPrCommits(
  baseRef: string,
  headRef: string,
  gitRoot: string,
): Promise<CommitInfo[]> {
  try {
    const { stdout } = await execa(
      'git',
      ['log', `${baseRef}..${headRef}`, '--format=%H|%s'],
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
