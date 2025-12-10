import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const KYOTO_DIR = '.kyoto'

export interface KyotoPaths {
  gitRoot: string
  root: string
  config: string
  vectra: string
}

/**
 * Finds the .kyoto directory paths for a given git root.
 * Creates necessary directories if they don't exist.
 *
 * @param gitRoot - The git repository root directory
 * @returns An object with absolute paths to .kyoto root, config.json, and vectra
 */
export async function pwdKyoto(gitRoot: string): Promise<KyotoPaths> {
  const root = join(gitRoot, KYOTO_DIR)
  const config = join(root, 'config.json')
  const vectra = join(root, 'vectra')

  // Create all necessary directories
  await mkdir(root, { recursive: true })

  return { gitRoot, root, config, vectra }
}
