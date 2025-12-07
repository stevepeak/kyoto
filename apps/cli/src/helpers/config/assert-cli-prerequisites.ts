import { findGitRoot, getGitHubInfo, type GitHubInfo } from '@app/shell'
import { createIndex, ensureIndex } from '@app/vectra'

import { pwdKyoto } from './find-kyoto-dir.js'
import { getAiConfig } from './get-ai-config.js'
import { detailsFileExists } from './kyoto-details.js'

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
 * Ensures the vectra database exists for story search functionality
 */
async function ensureVectraDatabase(): Promise<void> {
  const { vectra } = await pwdKyoto()
  const index = createIndex(vectra)
  await ensureIndex(index)
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
    // Ensure vectra database exists for story search
    await ensureVectraDatabase()
  }

  // Get GitHub info (optional - won't fail if not found)
  const github = await getGitHubInfo(gitRoot)

  return {
    gitRoot,
    github,
  }
}
