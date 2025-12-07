import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findGitRoot } from './find-kyoto-dir.js'

type Provider = 'openai' | 'vercel' | 'openrouter'

interface DetailsJson {
  latest?: {
    sha: string
    branch: string
  }
  ai?: {
    provider: Provider
    apiKey: string
    model?: string
  }
}

type AiConfig = {
  provider: Provider
  apiKey: string
  model?: string
} | null

/**
 * Checks if .kyoto/details.json exists
 * @returns true if file exists, false otherwise
 */
export async function detailsFileExists(): Promise<boolean> {
  try {
    const gitRoot = await findGitRoot()
    const detailsPath = join(gitRoot, '.kyoto', 'details.json')
    await readFile(detailsPath, 'utf-8')
    return true
  } catch {
    return false
  }
}

/**
 * Reads AI configuration from .kyoto/details.json
 * @returns AI configuration or null if not found
 */
export async function getAiConfig(): Promise<AiConfig> {
  try {
    const gitRoot = await findGitRoot()
    const detailsPath = join(gitRoot, '.kyoto', 'details.json')

    const content = await readFile(detailsPath, 'utf-8')
    const details = JSON.parse(content) as DetailsJson

    if (details.ai?.provider && details.ai?.apiKey) {
      return {
        provider: details.ai.provider,
        apiKey: details.ai.apiKey,
        model: details.ai.model,
      }
    }

    return null
  } catch {
    // File doesn't exist or is invalid, return null
    return null
  }
}

/**
 * Gets the API key for a specific provider from details.json
 */
export async function getApiKeyForProvider(
  provider: Provider,
): Promise<string | null> {
  const aiConfig = await getAiConfig()
  if (aiConfig && aiConfig.provider === provider) {
    return aiConfig.apiKey
  }

  return null
}
