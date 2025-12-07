import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import chalk from 'chalk'
import { findGitRoot } from '../git/find-git-root.js'

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
    const message = `Failed to write file: ${path}`
    console.error(chalk.red(`📝 ${message}`), { error })
    throw new Error(message)
  }
}
