import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
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
  /** Absolute path to the ~/.kyoto/config.json file */
  config: string
  /** Absolute path to the .kyoto/instructions.md file */
  instructions: string
  /** Absolute path to the .kyoto/vibe/check/check.json file */
  vibeCheck: string
  /** Absolute path to the .kyoto/vibe/test/browser-state.json file for persisting login sessions */
  browserState: string
}

/**
 * Gets the path to the user's config file (~/.kyoto/config.json).
 * Creates the directory if it doesn't exist.
 *
 * @returns Absolute path to ~/.kyoto/config.json
 */
export async function getConfigPath(): Promise<string> {
  const configDir = join(homedir(), KYOTO_DIR)
  await mkdir(configDir, { recursive: true })
  return join(configDir, 'config.json')
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
  const config = await getConfigPath()
  const instructions = join(root, 'instructions.md')
  const vibeCheck = join(root, 'vibe/check/check.json')
  const browserState = join(root, 'vibe/test/browser-state.json')

  // Create all necessary directories
  await mkdir(root, { recursive: true })
  await mkdir(join(root, 'vibe/check'), { recursive: true })
  await mkdir(join(root, 'vibe/test'), { recursive: true })

  return { gitRoot, root, config, instructions, vibeCheck, browserState }
}
