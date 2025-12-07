import { findGitRoot } from '@app/shell'
import { access, constants } from 'node:fs/promises'
import { join } from 'node:path'

const KYOTO_DIR = '.kyoto'

interface KyotoPaths {
  root: string
  stories: string
  details: string
  vectra: string
}

/**
 * Finds the .kyoto directory paths by using git to find the project root.
 * This allows the CLI to work regardless of where it's invoked from.
 *
 * @returns An object with absolute paths to .kyoto root, stories, and details.json
 * @throws {Error} If the .kyoto directory cannot be found or git root cannot be determined
 */
export async function pwdKyoto(): Promise<KyotoPaths> {
  const gitRoot = await findGitRoot()
  const root = join(gitRoot, KYOTO_DIR)
  const stories = join(root, 'stories')
  const details = join(root, 'details.json')
  const vectra = join(root, '.vectra', 'stories')

  // Verify the .kyoto directory exists
  try {
    await access(root, constants.F_OK)
    return { root, stories, details, vectra }
  } catch {
    throw new Error(`.kyoto directory not found: ${KYOTO_DIR}`)
  }
}
