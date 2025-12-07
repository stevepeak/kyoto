import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findGitRoot } from '@app/shell'

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
