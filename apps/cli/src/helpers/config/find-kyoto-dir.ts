import { access, constants } from 'node:fs/promises'
import { join } from 'node:path'

const KYOTO_DIR = '.kyoto'

export interface KyotoPaths {
  gitRoot: string
  root: string
  stories: string
  artifacts: string
  details: string
  vectra: string
}

/**
 * Finds the .kyoto directory paths for a given git root.
 *
 * @param gitRoot - The git repository root directory
 * @returns An object with absolute paths to .kyoto root, stories, and config.json
 * @throws {Error} If the .kyoto directory cannot be found
 */
export async function pwdKyoto(gitRoot: string): Promise<KyotoPaths> {
  const root = join(gitRoot, KYOTO_DIR)
  const stories = join(root, 'stories')
  const artifacts = join(root, 'artifacts')
  const details = join(root, '.ignore', 'config.json')
  const vectra = join(root, '.ignore', 'vectra.json')

  // Verify the .kyoto directory exists
  try {
    await access(root, constants.F_OK)
    return { gitRoot, root, stories, artifacts, details, vectra }
  } catch {
    throw new Error(`.kyoto directory not found: ${KYOTO_DIR}`)
  }
}
