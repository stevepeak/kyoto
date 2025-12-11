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
 * Ensures the vectra database exists for story search functionality
 */
async function ensureVectraDatabase(vectra: string): Promise<void> {
  const index = createIndex(vectra)
  await ensureIndex(index)
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

  // Ensure vectra database exists for story search
  await ensureVectraDatabase(fs.vectra)

  // Construct the AI model from config
  const { model } = constructModel(config)

  return {
    git,
    fs,
    config,
    model,
  }
}

/**
 * Alias for init() that returns gitRoot and github for backward compatibility
 */
export async function assertCliPrerequisites(): Promise<{
  gitRoot: string
  github?: { owner: string; repo: string } | null
  config: Config
  model: LanguageModel
}> {
  const result = await init()
  return {
    gitRoot: result.fs.gitRoot,
    github:
      result.git.owner && result.git.repo
        ? { owner: result.git.owner, repo: result.git.repo }
        : null,
    config: result.config,
    model: result.model,
  }
}
