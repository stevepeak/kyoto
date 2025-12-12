import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

interface ConfigJson {
  latest?: {
    sha: string
    branch: string
  }
  ai?: {
    provider: string
    apiKey: string
    model?: string
  }
  user?: {
    sessionToken: string
    userId: string
    openrouterApiKey: string
  }
}

/**
 * Updates the .kyoto/config.json file with the latest branch and commit SHA
 */
export async function updateConfigJson(
  configPath: string,
  branch: string | null,
  sha: string | null,
  config?: ConfigJson,
): Promise<void> {
  let configToWrite: ConfigJson = config ?? {}

  // If config not provided, read existing config.json if it exists
  if (!config) {
    try {
      const content = await readFile(configPath, 'utf-8')
      configToWrite = JSON.parse(content) as ConfigJson
    } catch {
      // File doesn't exist or is invalid, start with empty object
      configToWrite = {}
    }
  }

  // Update the latest field
  if (branch && sha) {
    configToWrite.latest = {
      sha,
      branch,
    }
  }

  // Ensure .kyoto directory exists
  const kyotoDir = dirname(configPath)
  await mkdir(kyotoDir, { recursive: true })

  // Write the config
  await writeFile(
    configPath,
    JSON.stringify(configToWrite, null, 2) + '\n',
    'utf-8',
  )
}
