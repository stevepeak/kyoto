import { execa } from 'execa'

/**
 * Gets staged TypeScript files from the git index.
 *
 * @param gitRoot - The git repository root directory
 * @returns Array of staged TypeScript file paths
 */
export async function getStagedTsFiles(gitRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execa('git', ['diff', '--cached', '--name-only'], {
      cwd: gitRoot,
    })

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 && (line.endsWith('.ts') || line.endsWith('.tsx')),
      )
  } catch {
    return []
  }
}
