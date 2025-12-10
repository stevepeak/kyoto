import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

interface DetailsJson {
  latest?: {
    sha: string
    branch: string
  }
  ai?: {
    provider: string
    apiKey: string
    model?: string
  }
}

/**
 * Updates the .kyoto/config.json file with the latest branch and commit SHA
 */
export async function updateDetailsJson(
  detailsPath: string,
  branch: string | null,
  sha: string | null,
): Promise<void> {
  let details: DetailsJson = {}

  // Read existing config.json if it exists
  try {
    const content = await readFile(detailsPath, 'utf-8')
    details = JSON.parse(content) as DetailsJson
  } catch {
    // File doesn't exist or is invalid, start with empty object
    details = {}
  }

  // Update the latest field
  if (branch && sha) {
    details.latest = {
      sha,
      branch,
    }

    // Ensure .kyoto directory exists
    const kyotoDir = dirname(detailsPath)
    await mkdir(kyotoDir, { recursive: true })

    // Write the updated details back
    await writeFile(
      detailsPath,
      JSON.stringify(details, null, 2) + '\n',
      'utf-8',
    )
  }
}
