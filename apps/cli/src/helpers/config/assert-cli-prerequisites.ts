import {
  findGitRoot,
  getCurrentBranch,
  getCurrentCommitSha,
  getGitHubInfo,
  hasChanges,
  hasStagedChanges,
  isBranchClean,
} from '@app/shell'
import { createIndex, ensureIndex } from '@app/vectra'

import { type KyotoPaths, pwdKyoto } from './find-kyoto-dir'
import { getAiConfig } from './get-ai-config'
import { detailsFileExists } from './kyoto-details'

interface GitInfo {
  owner: string | null
  repo: string | null
  sha: string | null
  branch: string | null
  isBranchClean: boolean
  hasStagedChanges: boolean
  hasChanges: boolean
}

interface InitResult {
  git: GitInfo
  fs: KyotoPaths
}

/**
 * Asserts that the project has been initialized with AI configuration.
 * Requires that .kyoto/config.json exists and contains AI configuration.
 * Throws an error with helpful message if not initialized.
 */
async function assertAiConfiguration(): Promise<void> {
  // Check if config.json file exists
  const fileExists = await detailsFileExists()
  if (!fileExists) {
    throw new Error(
      'Kyoto project not initialized. Please run `kyoto setup` to configure your AI provider and API key.',
    )
  }

  // Check if AI configuration exists in config.json
  const aiConfig = await getAiConfig()
  if (!aiConfig) {
    throw new Error(
      'AI configuration not found. Please run `kyoto setup` to configure your AI provider and API key.',
    )
  }
}

/**
 * Ensures the vectra database exists for story search functionality
 */
async function ensureVectraDatabase(vectra: string): Promise<void> {
  const index = createIndex(vectra)
  await ensureIndex(index)
}

/**
 * Initializes the CLI environment:
 * 1. Ensures the .kyoto directory exists
 * 2. Optionally checks that the project is initialized (config.json exists with AI config)
 * 3. We are in a git repository
 * 4. Gets git information (owner, repo, sha, branch, status)
 * 5. Returns Kyoto directory paths
 *
 * @param options - Options for initialization
 * @param options.requireAi - Whether to require AI configuration (default: true)
 * @returns Object containing git info and file system paths
 * @throws {Error} If prerequisites are not met
 */
export async function init(options?: {
  requireAi?: boolean
}): Promise<InitResult> {
  const { requireAi = true } = options ?? {}

  // Assert we're in a git repository and get the root first
  const gitRoot = await findGitRoot()

  // Gather remaining prerequisites
  const [fs, github, branch, sha, clean, staged, changes] = await Promise.all([
    pwdKyoto(gitRoot),
    getGitHubInfo(gitRoot),
    getCurrentBranch(gitRoot),
    getCurrentCommitSha(gitRoot),
    isBranchClean(gitRoot),
    hasStagedChanges(gitRoot),
    hasChanges(gitRoot),
  ])

  const git: GitInfo = {
    owner: github?.owner ?? null,
    repo: github?.repo ?? null,
    sha,
    branch,
    isBranchClean: clean,
    hasStagedChanges: staged,
    hasChanges: changes,
  }

  // Assert AI configuration if required (must be after gitRoot check)
  if (requireAi) {
    await assertAiConfiguration()
    // Ensure vectra database exists for story search
    await ensureVectraDatabase(fs.vectra)
  }

  return {
    git,
    fs,
  }
}
