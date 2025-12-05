import { stat, readdir } from 'node:fs/promises'
import { resolve, join, extname } from 'node:path'

/**
 * Validates that a file or directory path exists and is accessible.
 * Throws an error if the path doesn't exist or is not a file or directory.
 *
 * @param filePath - Relative or absolute path to validate
 * @throws {Error} If the path doesn't exist or is not a file/directory
 */
export async function validateFilePath(filePath: string): Promise<void> {
  const resolvedPath = resolve(process.cwd(), filePath)

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
 * Recursively finds all TypeScript files (.ts, .tsx) in a directory.
 * Skips common build and dependency directories (node_modules, dist, .next, etc.)
 * and hidden directories/files.
 *
 * @param dirPath - Directory path to search (relative to current working directory)
 * @returns Array of relative file paths sorted alphabetically
 */
export async function findTypeScriptFiles(dirPath: string): Promise<string[]> {
  const files: string[] = []
  const resolvedPath = resolve(process.cwd(), dirPath)

  async function walkDir(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name)

      // Skip node_modules, .git, dist, etc.
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.next' ||
        entry.name === '.turbo'
      ) {
        continue
      }

      if (entry.isDirectory()) {
        await walkDir(fullPath)
      } else if (entry.isFile()) {
        const ext = extname(entry.name)
        if (ext === '.ts' || ext === '.tsx') {
          // Return relative path from original dirPath
          const relativePath = fullPath.replace(
            resolve(process.cwd(), dirPath) + '/',
            '',
          )
          files.push(join(dirPath, relativePath))
        }
      }
    }
  }

  await walkDir(resolvedPath)
  return files.sort()
}
