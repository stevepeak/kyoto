import {
  findGitRoot,
  getCurrentBranch,
  getCurrentCommitSha,
  getGitHubInfo,
  hasChanges,
  hasStagedChanges,
  isBranchClean,
} from '@app/shell'
import { type LanguageModel } from 'ai'

import { type KyotoPaths, pwdKyoto } from './config/find-kyoto-dir'
import { type Config, getConfig } from './config/get'
import { constructModel } from './config/get-model'

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
  config: Config
  model: LanguageModel
}

/**
 * Initializes the CLI environment:
 * 1. Ensures the .kyoto directory exists
 * 2. Validates that the project is initialized (config.json exists with AI config)
 * 3. We are in a git repository
 * 4. Gets git information (owner, repo, sha, branch, status)
 * 5. Returns Kyoto directory paths and config
 *
 * @returns Object containing git info, file system paths, and config
 * @throws {Error} If prerequisites are not met
 */
export async function init(): Promise<InitResult> {
  // Assert we're in a git repository and get the root first
  const gitRoot = await findGitRoot()

  // Gather remaining prerequisites
  const [fs, github, branch, sha, clean, staged, changes, config] =
    await Promise.all([
      pwdKyoto(gitRoot),
      getGitHubInfo(gitRoot),
      getCurrentBranch(gitRoot),
      getCurrentCommitSha(gitRoot),
      isBranchClean(gitRoot),
      hasStagedChanges(gitRoot),
      hasChanges(gitRoot),
      getConfig(),
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

  // Construct the AI model from config
  const { model } = constructModel(config)

  return {
    git,
    fs,
    config,
    model,
  }
}
