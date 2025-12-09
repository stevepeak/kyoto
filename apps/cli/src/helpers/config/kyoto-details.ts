import { findGitRoot } from '@app/shell'
import { readFile } from 'node:fs/promises'

import { pwdKyoto } from './find-kyoto-dir'

/**
 * Checks if .kyoto/cache/config.json exists
 * @returns true if file exists, false otherwise
 */
export async function detailsFileExists(): Promise<boolean> {
  try {
    const gitRoot = await findGitRoot()
    const { config: detailsPath } = await pwdKyoto(gitRoot)
    await readFile(detailsPath, 'utf-8')
    return true
  } catch {
    return false
  }
}
