import { execa } from 'execa'
import { findGitRoot } from './find-kyoto-dir.js'
import { getAiConfig, detailsFileExists } from './get-ai-config.js'

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
 * Asserts that the project has been initialized with AI configuration.
 * Requires that .kyoto/details.json exists and contains AI configuration.
 * Throws an error with helpful message if not initialized.
 */
async function assertAiConfiguration(): Promise<void> {
  // Check if details.json file exists
  const fileExists = await detailsFileExists()
  if (!fileExists) {
    throw new Error(
      'Kyoto project not initialized. Please run `kyoto init` to configure your AI provider and API key.',
    )
  }

  // Check if AI configuration exists in details.json
  const aiConfig = await getAiConfig()
  if (!aiConfig) {
    throw new Error(
      'AI configuration not found. Please run `kyoto init` to configure your AI provider and API key.',
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
 * 1. Optionally checks that the project is initialized (details.json exists with AI config)
 * 2. We are in a git repository
 * 3. Gets the git root and GitHub info (if available)
 *
 * @param options - Options for assertion
 * @param options.requireAi - Whether to require AI configuration (default: true)
 * @returns Object containing git root and GitHub info
 * @throws {Error} If prerequisites are not met
 */
export async function assertCliPrerequisites(options?: {
  requireAi?: boolean
}): Promise<CliPrerequisites> {
  const { requireAi = true } = options ?? {}

  // Assert we're in a git repository and get the root first
  const gitRoot = await findGitRoot()

  // Assert AI configuration if required (must be after gitRoot check)
  if (requireAi) {
    await assertAiConfiguration()
  }

  // Get GitHub info (optional - won't fail if not found)
  const github = await getGitHubInfo(gitRoot)

  return {
    gitRoot,
    github,
  }
}
