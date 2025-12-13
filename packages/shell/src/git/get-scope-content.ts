import { type VibeCheckScope } from '@app/types'
import { execa } from 'execa'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { getChangedTsFiles } from './get-changed-ts-files'
import { getChangedTsFilesFromCommits } from './get-changed-ts-files-from-commits'
import { getStagedTsFiles } from './get-staged-ts-files'
import { getUnstagedTsFiles } from './get-unstaged-ts-files'

export interface ScopeContext {
  filePaths: string[]
  diffs: Record<string, string> // path -> diff content
  fileContents: Record<string, string> // path -> full file content (for untracked files or when diff not available)
}

/**
 * Gets all changed TypeScript file paths for a given scope.
 */
export async function getScopeFilePaths(
  scope: VibeCheckScope,
  gitRoot: string,
): Promise<string[]> {
  switch (scope.type) {
    case 'commit':
      return await getChangedTsFiles(scope.commit, gitRoot)
    case 'commits':
      return await getChangedTsFilesFromCommits(scope.commits, gitRoot)
    case 'staged':
      return await getStagedTsFiles(gitRoot)
    case 'unstaged':
      return await getUnstagedTsFiles(gitRoot)
    case 'changes': {
      // Check all changes (staged + unstaged)
      const stagedFiles = await getStagedTsFiles(gitRoot)
      const unstagedFiles = await getUnstagedTsFiles(gitRoot)
      // Combine and deduplicate
      const allFiles = new Set([...stagedFiles, ...unstagedFiles])
      return Array.from(allFiles)
    }
    case 'paths':
      // Filter to only TypeScript files
      return scope.paths.filter(
        (path) => path.endsWith('.ts') || path.endsWith('.tsx'),
      )
  }
}

/**
 * Gets the diff for a specific file path based on scope type.
 */
async function getFileDiff(
  scope: VibeCheckScope,
  filePath: string,
  gitRoot: string,
): Promise<string> {
  try {
    switch (scope.type) {
      case 'commit': {
        const { stdout } = await execa(
          'git',
          ['show', scope.commit, '--', filePath],
          { cwd: gitRoot },
        )
        return stdout
      }
      case 'commits': {
        // For multiple commits, show diff for each commit and combine
        const allDiffs: string[] = []
        for (const commit of scope.commits) {
          try {
            const { stdout } = await execa(
              'git',
              ['show', commit, '--', filePath],
              { cwd: gitRoot },
            )
            if (stdout.trim().length > 0) {
              allDiffs.push(stdout)
            }
          } catch {
            // Continue with next commit if one fails
          }
        }
        return allDiffs.join('\n')
      }
      case 'staged': {
        const { stdout } = await execa(
          'git',
          ['diff', '--cached', '--', filePath],
          { cwd: gitRoot },
        )
        return stdout
      }
      case 'unstaged': {
        // Check if file is tracked
        try {
          await execa('git', ['ls-files', '--error-unmatch', '--', filePath], {
            cwd: gitRoot,
          })
          // File is tracked, get diff
          const { stdout } = await execa('git', ['diff', '--', filePath], {
            cwd: gitRoot,
          })
          return stdout
        } catch {
          // File is untracked, return empty (will use fileContents instead)
          return ''
        }
      }
      case 'changes': {
        // For 'changes' scope, get both staged and unstaged diffs (all changes)
        try {
          await execa('git', ['ls-files', '--error-unmatch', '--', filePath], {
            cwd: gitRoot,
          })
          // File is tracked, get both staged and unstaged diffs
          const stagedResult = await execa(
            'git',
            ['diff', '--cached', '--', filePath],
            { cwd: gitRoot },
          ).catch(() => ({ stdout: '' }))
          const unstagedResult = await execa('git', ['diff', '--', filePath], {
            cwd: gitRoot,
          }).catch(() => ({ stdout: '' }))
          return [stagedResult.stdout, unstagedResult.stdout]
            .filter((s) => s.trim().length > 0)
            .join('\n')
        } catch {
          // File is untracked, return empty (will use fileContents instead)
          return ''
        }
      }
      case 'paths':
        // For paths scope, try to get diff if file is tracked
        try {
          await execa('git', ['ls-files', '--error-unmatch', '--', filePath], {
            cwd: gitRoot,
          })
          // File is tracked, get staged + unstaged diff
          const stagedResult = await execa(
            'git',
            ['diff', '--cached', '--', filePath],
            { cwd: gitRoot },
          ).catch(() => ({ stdout: '' }))
          const unstagedResult = await execa('git', ['diff', '--', filePath], {
            cwd: gitRoot,
          }).catch(() => ({ stdout: '' }))
          return [stagedResult.stdout, unstagedResult.stdout]
            .filter((s) => s.trim().length > 0)
            .join('\n')
        } catch {
          // File is untracked, return empty (will use fileContents instead)
          return ''
        }
    }
  } catch {
    return ''
  }
}

/**
 * Gets full file content for a file path.
 */
async function getFileContent(
  filePath: string,
  gitRoot: string,
): Promise<string> {
  try {
    const absPath = resolve(gitRoot, filePath)
    const content = await readFile(absPath, 'utf-8')
    return content
  } catch {
    return ''
  }
}

/**
 * Checks if a file is tracked in git.
 */
async function isFileTracked(
  filePath: string,
  gitRoot: string,
): Promise<boolean> {
  try {
    await execa('git', ['ls-files', '--error-unmatch', '--', filePath], {
      cwd: gitRoot,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Gets unified diff for all changed files in the scope.
 */
export async function getScopeDiffs(
  scope: VibeCheckScope,
  gitRoot: string,
): Promise<Record<string, string>> {
  const filePaths = await getScopeFilePaths(scope, gitRoot)
  const diffs: Record<string, string> = {}

  // Get per-file diffs in parallel for efficiency
  const diffPromises = filePaths.map(async (filePath) => {
    const diff = await getFileDiff(scope, filePath, gitRoot)
    if (diff.trim().length > 0) {
      return { filePath, diff }
    }
    return null
  })

  const results = await Promise.all(diffPromises)
  for (const result of results) {
    if (result) {
      diffs[result.filePath] = result.diff
    }
  }

  return diffs
}

/**
 * Gets full file contents for files in the scope.
 * This is needed for untracked files or when diffs aren't available.
 */
export async function getScopeFileContents(
  scope: VibeCheckScope,
  gitRoot: string,
): Promise<Record<string, string>> {
  const filePaths = await getScopeFilePaths(scope, gitRoot)
  const contents: Record<string, string> = {}

  for (const filePath of filePaths) {
    const isTracked = await isFileTracked(filePath, gitRoot)
    // For untracked files or paths scope, we need full content
    if (!isTracked || scope.type === 'paths') {
      const content = await getFileContent(filePath, gitRoot)
      if (content.length > 0) {
        contents[filePath] = content
      }
    }
  }

  return contents
}

/**
 * Gets complete scope context including file paths, diffs, and file contents.
 * This is the main function to retrieve all scope information programmatically.
 */
export async function getScopeContext(
  scope: VibeCheckScope,
  gitRoot: string,
): Promise<ScopeContext> {
  const filePaths = await getScopeFilePaths(scope, gitRoot)
  const [diffs, fileContents] = await Promise.all([
    getScopeDiffs(scope, gitRoot),
    getScopeFileContents(scope, gitRoot),
  ])

  return {
    filePaths,
    diffs,
    fileContents,
  }
}
