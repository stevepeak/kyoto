import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const KYOTO_DIR = '.kyoto'

export interface KyotoPaths {
  gitRoot: string
  root: string
  stories: string
  artifacts: string
  cache: string
  config: string
  vectra: string
}

/**
 * Finds the .kyoto directory paths for a given git root.
 * Creates necessary directories if they don't exist.
 *
 * @param gitRoot - The git repository root directory
 * @returns An object with absolute paths to .kyoto root, stories, cache, config.json, and vectra
 */
export async function pwdKyoto(gitRoot: string): Promise<KyotoPaths> {
  const root = join(gitRoot, KYOTO_DIR)
  const stories = join(root, 'stories')
  const artifacts = join(root, 'artifacts')

  const cache = join(root, 'cache')
  const config = join(cache, 'config.json')
  const vectra = join(cache, '.vectra')

  // Create all necessary directories
  await mkdir(root, { recursive: true })
  await mkdir(cache, { recursive: true })
  await mkdir(stories, { recursive: true })
  await mkdir(artifacts, { recursive: true })

  return { gitRoot, root, stories, artifacts, cache, config, vectra }
}
