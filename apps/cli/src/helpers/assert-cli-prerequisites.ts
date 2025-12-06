import { execa } from 'execa'
import { findGitRoot } from './find-kyoto-dir.js'

interface GitHubInfo {
  owner: string
  repo: string
  url: string
}

interface CliPrerequisites {
  gitRoot: string
  github: GitHubInfo | null
}

/**
 * Asserts that at least one AI environment variable is set.
 * Throws an error with helpful message if none are found.
 */
function assertAiEnvironmentVariables(): void {
  const openaiApiKey = process.env.OPENAI_API_KEY
  const openrouterApiKey = process.env.OPENROUTER_API_KEY
  const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY

  if (!openaiApiKey && !openrouterApiKey && !aiGatewayApiKey) {
    throw new Error(
      'At least one AI API key is required:\n' +
        '  - OPENAI_API_KEY\n' +
        '  - OPENROUTER_API_KEY\n' +
        '  - AI_GATEWAY_API_KEY\n' +
        '\nPlease set one of these environment variables.',
    )
  }
}

/**
 * Gets the GitHub remote URL and extracts owner/repo information.
 * Returns null if no GitHub remote is found or if it's not a GitHub URL.
 *
 * @param gitRoot - The git repository root directory
 * @returns GitHub info (owner, repo, url) or null if not found
 */
async function getGitHubInfo(gitRoot: string): Promise<GitHubInfo | null> {
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
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    )
    const sshMatch = remoteUrl.match(
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
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

/**
 * Asserts CLI prerequisites:
 * 1. Optionally checks that at least one AI environment variable exists
 * 2. We are in a git repository
 * 3. Gets the git root and GitHub info (if available)
 *
 * @param options - Options for assertion
 * @param options.requireAi - Whether to require AI environment variables (default: true)
 * @returns Object containing git root and GitHub info
 * @throws {Error} If prerequisites are not met
 */
export async function assertCliPrerequisites(options?: {
  requireAi?: boolean
}): Promise<CliPrerequisites> {
  const { requireAi = true } = options ?? {}

  // Assert AI environment variables if required
  if (requireAi) {
    assertAiEnvironmentVariables()
  }

  // Assert we're in a git repository and get the root
  const gitRoot = await findGitRoot()

  // Get GitHub info (optional - won't fail if not found)
  const github = await getGitHubInfo(gitRoot)

  return {
    gitRoot,
    github,
  }
}
