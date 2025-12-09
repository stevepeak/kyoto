import { findGitRoot } from '@app/shell'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Checks if .kyoto/.ignore/config.json exists
 * @returns true if file exists, false otherwise
 */
export async function detailsFileExists(): Promise<boolean> {
  try {
    const gitRoot = await findGitRoot()
    const detailsPath = join(gitRoot, '.kyoto', '.ignore', 'config.json')
    await readFile(detailsPath, 'utf-8')
    return true
  } catch {
    return false
  }
}
