import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { findGitRoot } from '../git/find-git-root'

export async function writeLocalFile(
  path: string,
  content: string,
): Promise<void> {
  const gitRoot = await findGitRoot()
  const absFilePath = resolve(gitRoot, path)
  const dir = dirname(absFilePath)

  try {
    // Ensure directory exists
    await mkdir(dir, { recursive: true })
    await writeFile(absFilePath, content, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to write file: ${path}`)
  }
}
