import { execa } from 'execa'

export interface GitHubInfo {
  owner: string
  repo: string
  url: string
}

/**
 * Gets the GitHub remote URL and extracts owner/repo information.
 * Returns null if no GitHub remote is found or if it's not a GitHub URL.
 *
 * @param gitRoot - The git repository root directory
 * @returns GitHub info (owner, repo, url) or null if not found
 */
export async function getGitHubInfo(
  gitRoot: string,
): Promise<GitHubInfo | null> {
  try {
    // Try to get the remote URL
    const { stdout } = await execa(
      'git',
      ['config', '--get', 'remote.origin.url'],
      {
        cwd: gitRoot,
      },
    )

    const remoteUrl = stdout.trim()

    // Parse GitHub URLs
    // Supports:
    // - https://github.com/owner/repo.git
    // - https://github.com/owner/repo
    // - git@github.com:owner/repo.git
    // - git@github.com:owner/repo
    const httpsMatch = remoteUrl.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    )
    const sshMatch = remoteUrl.match(
      /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
    )

    if (httpsMatch) {
      const [, owner, repo] = httpsMatch
      return {
        owner,
        repo: repo.replace(/\.git$/, ''),
        url: `https://github.com/${owner}/${repo}`,
      }
    }

    if (sshMatch) {
      const [, owner, repo] = sshMatch
      return {
        owner,
        repo: repo.replace(/\.git$/, ''),
        url: `https://github.com/${owner}/${repo}`,
      }
    }

    // Not a GitHub URL
    return null
  } catch {
    // No remote found or error getting remote
    return null
  }
}

