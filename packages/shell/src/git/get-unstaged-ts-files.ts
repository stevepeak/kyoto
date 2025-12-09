import { execa } from 'execa'

/**
 * Gets unstaged TypeScript files from the working directory (including untracked files).
 * This includes both modified files and untracked files.
 *
 * @param gitRoot - The git repository root directory
 * @returns Array of unstaged TypeScript file paths
 */
export async function getUnstagedTsFiles(gitRoot: string): Promise<string[]> {
  try {
    // Get modified files (unstaged changes)
    const { stdout: modifiedStdout } = await execa(
      'git',
      ['diff', '--name-only'],
      {
        cwd: gitRoot,
      },
    )

    // Get untracked files
    const { stdout: untrackedStdout } = await execa(
      'git',
      ['ls-files', '--others', '--exclude-standard'],
      {
        cwd: gitRoot,
      },
    )

    const allFiles = [
      ...modifiedStdout.split('\n'),
      ...untrackedStdout.split('\n'),
    ]

    return allFiles
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 && (line.endsWith('.ts') || line.endsWith('.tsx')),
      )
  } catch {
    return []
  }
}
