import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const KYOTO_DIR = '.kyoto'

/**
 * Paths related to the Kyoto project directory.
 */
export interface KyotoPaths {
  /** Absolute path to the root of the git repository */
  gitRoot: string
  /** Absolute path to the .kyoto directory inside the git repository */
  root: string
  /** Absolute path to the .kyoto/config.json file */
  config: string
  /** Absolute path to the .kyoto/instructions.md file */
  instructions: string
  /** Absolute path to the .kyoto/browser-state.json file for persisting login sessions */
  browserState: string
}

/**
 * Finds the .kyoto directory paths for a given git root.
 * Creates necessary directories if they don't exist.
 *
 * @param gitRoot - The git repository root directory
 * @returns An object with absolute paths to .kyoto root, config.json
 */
export async function pwdKyoto(gitRoot: string): Promise<KyotoPaths> {
  const root = join(gitRoot, KYOTO_DIR)
  const config = join(root, 'config.json')
  const instructions = join(root, 'instructions.md')
  const browserState = join(root, 'browser-state.json')

  // Create all necessary directories
  await mkdir(root, { recursive: true })

  return { gitRoot, root, config, instructions, browserState }
}
