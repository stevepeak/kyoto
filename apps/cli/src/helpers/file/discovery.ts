import { stat } from 'node:fs/promises'
import { resolve, extname, isAbsolute } from 'node:path'
import { execa } from 'execa'
import { findGitRoot } from '@app/shell'

/**
 * Validates that a file or directory path exists and is accessible.
 * Throws an error if the path doesn't exist or is not a file or directory.
 *
 * @param filePath - Relative or absolute path to validate (relative paths are resolved from git root)
 * @throws {Error} If the path doesn't exist or is not a file/directory
 */
export async function validateFilePath(filePath: string): Promise<void> {
  const gitRoot = await findGitRoot()
  const resolvedPath = isAbsolute(filePath)
    ? filePath
    : resolve(gitRoot, filePath)

  try {
    const stats = await stat(resolvedPath)

    if (!stats.isFile() && !stats.isDirectory()) {
      throw new Error(`Path is not a file or directory: ${filePath}`)
    }
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      throw new Error(
        `File or directory not found: ${filePath}\nPlease check that the path exists and is correct.`,
      )
    }
    throw error
  }
}

/**
 * Finds all TypeScript files (.ts, .tsx) in a directory using git ls-files.
 * Only returns files that are tracked by git.
 *
 * @param dirPath - Directory path to search (relative to git root or absolute)
 * @returns Array of relative file paths sorted alphabetically
 */
export async function findTypeScriptFiles(dirPath: string): Promise<string[]> {
  const gitRoot = await findGitRoot()
  const resolvedPath = isAbsolute(dirPath) ? dirPath : resolve(gitRoot, dirPath)

  // Ensure the path is under the git root
  if (!resolvedPath.startsWith(gitRoot)) {
    throw new Error(
      `Path ${dirPath} is not within the git repository root: ${gitRoot}`,
    )
  }

  // Get relative path from git root
  let relativePath = resolvedPath.replace(gitRoot + '/', '')
  // Handle case where resolvedPath equals gitRoot (empty relative path)
  if (relativePath === resolvedPath) {
    relativePath = '.'
  }

  try {
    // Use git ls-files to get only tracked files
    // This ensures we only look at files that are checked into git
    // If relativePath is a directory, git ls-files will list all files under it
    const { stdout } = await execa('git', ['ls-files', '--', relativePath], {
      cwd: gitRoot,
    })

    const allFiles = stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)

    // Filter for TypeScript files
    const tsFiles = allFiles.filter((file) => {
      const ext = extname(file)
      return ext === '.ts' || ext === '.tsx'
    })

    return tsFiles.sort()
  } catch (error) {
    // If git ls-files fails, throw a helpful error
    if (error instanceof Error) {
      throw new Error(
        `Failed to list git files: ${error.message}\n` +
          'Make sure you are in a git repository and the path is valid.',
      )
    }
    throw error
  }
}
