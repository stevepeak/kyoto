import { execa } from 'execa'

/**
 * Returns all uncommitted file paths (staged + unstaged + untracked).
 *
 * Uses `git status --porcelain -z` for robust parsing (spaces, renames, etc).
 */
export async function getUncommittedFilePaths(
  gitRoot: string,
): Promise<string[]> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain', '-z'], {
      cwd: gitRoot,
    })

    const tokens = stdout.split('\0').filter((t) => t.length > 0)
    const files = new Set<string>()

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (!token || token.length < 4) {
        continue
      }

      const status = token.slice(0, 2)
      const pathA = token.slice(3)
      if (pathA.length > 0) {
        files.add(pathA)
      }

      // Renames/copies include a second path as the next NUL-delimited token.
      const isRenameOrCopy = status.includes('R') || status.includes('C')
      if (isRenameOrCopy) {
        const pathB = tokens[i + 1]
        if (pathB && pathB.length > 0) {
          files.add(pathB)
          i++
        }
      }
    }

    return Array.from(files)
  } catch {
    return []
  }
}
