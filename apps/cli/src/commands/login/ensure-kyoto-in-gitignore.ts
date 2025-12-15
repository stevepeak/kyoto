import { findGitRoot } from '@app/shell'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const IGNORE_PATTERN = '.kyoto'

export async function ensureKyotoInGitignore(): Promise<void> {
  try {
    const gitRoot = await findGitRoot()
    const gitignorePath = join(gitRoot, '.gitignore')

    let gitignoreContent = ''
    try {
      gitignoreContent = await readFile(gitignorePath, 'utf-8')
    } catch {
      // .gitignore doesn't exist, we'll create it
      gitignoreContent = ''
    }

    const lines = gitignoreContent.split('\n')
    const patternExists = lines.some((line) => line.trim() === IGNORE_PATTERN)
    if (patternExists) {
      return
    }

    const newContent =
      gitignoreContent.trim() === ''
        ? IGNORE_PATTERN
        : gitignoreContent.trimEnd() + '\n' + IGNORE_PATTERN + '\n'

    await writeFile(gitignorePath, newContent, 'utf-8')
  } catch {
    // Silent best-effort
  }
}
