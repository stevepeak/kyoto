import { type VibeCheckScope } from '@app/types'
import { execa } from 'execa'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { getChangedTsFiles } from './get-changed-ts-files'
import { getChangedTsFilesFromCommits } from './get-changed-ts-files-from-commits'
import { getStagedTsFiles } from './get-staged-ts-files'
import { getUnstagedTsFiles } from './get-unstaged-ts-files'

/**
 * Parses a line range string (e.g., "1-10", "5", "20-30") and returns start and end line numbers.
 * If only a single number is provided, returns that line only.
 * If no range is provided (empty string), returns null (meaning all lines).
 */
function parseLineRange(lines: string): { start: number; end: number } | null {
  if (!lines || lines.trim().length === 0) {
    return null // No range specified, means all lines
  }

  const trimmed = lines.trim()
  const dashIndex = trimmed.indexOf('-')

  if (dashIndex === -1) {
    // Single line number
    const lineNum = Number.parseInt(trimmed, 10)
    if (Number.isNaN(lineNum) || lineNum < 1) {
      return null
    }
    return { start: lineNum, end: lineNum }
  }

  // Range format: start-end
  const startStr = trimmed.slice(0, dashIndex).trim()
  const endStr = trimmed.slice(dashIndex + 1).trim()

  const start = Number.parseInt(startStr, 10)
  const end = Number.parseInt(endStr, 10)

  if (Number.isNaN(start) || Number.isNaN(end) || start < 1 || end < start) {
    return null
  }

  return { start, end }
}

/**
 * Extracts specific line ranges from file content.
 * Line numbers are 1-indexed.
 */
function extractLineRanges(
  content: string,
  lineRanges: { start: number; end: number }[],
): string {
  const lines = content.split('\n')
  const extractedLines: string[] = []

  for (const range of lineRanges) {
    // Extract lines (1-indexed, so subtract 1 for array index)
    const startIdx = Math.max(0, range.start - 1)
    const endIdx = Math.min(lines.length, range.end)

    for (let i = startIdx; i < endIdx; i++) {
      extractedLines.push(lines[i] ?? '')
    }
  }

  return extractedLines.join('\n')
}

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
    case 'file-lines':
      // Extract unique file paths from changes
      const fileSet = new Set<string>()
      for (const change of scope.changes) {
        fileSet.add(change.file)
      }
      // Filter to only TypeScript files
      return Array.from(fileSet).filter(
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
      case 'file-lines': {
        // For file-lines scope, get the full diff/content first, then extract specified lines
        // Find the change entry for this file
        const fileChange = scope.changes.find((c) => c.file === filePath)
        if (!fileChange) {
          return '' // File not in changes list
        }

        // Get full diff/content (try staged + unstaged like 'paths' scope)
        let fullContent = ''
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
          fullContent = [stagedResult.stdout, unstagedResult.stdout]
            .filter((s) => s.trim().length > 0)
            .join('\n')
        } catch {
          // File is untracked, get full file content
          try {
            fullContent = await getFileContent(filePath, gitRoot)
          } catch {
            return ''
          }
        }

        // If no line range specified, return full content
        if (!fileChange.lines || fileChange.lines.trim().length === 0) {
          return fullContent
        }

        // Parse line ranges (can be comma-separated: "1-10,20-30")
        const lineRangeStrs = fileChange.lines.split(',').map((s) => s.trim())
        const lineRanges: { start: number; end: number }[] = []

        for (const rangeStr of lineRangeStrs) {
          const range = parseLineRange(rangeStr)
          if (range) {
            lineRanges.push(range)
          }
        }

        if (lineRanges.length === 0) {
          return fullContent // Invalid range, return full content
        }

        // Extract specified line ranges
        return extractLineRanges(fullContent, lineRanges)
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
    // For untracked files or paths/file-lines scope, we need full content
    if (!isTracked || scope.type === 'paths' || scope.type === 'file-lines') {
      const fullContent = await getFileContent(filePath, gitRoot)
      if (fullContent.length > 0) {
        // For file-lines scope, extract specified line ranges if provided
        if (scope.type === 'file-lines') {
          const fileChange = scope.changes.find((c) => c.file === filePath)
          if (
            fileChange &&
            fileChange.lines &&
            fileChange.lines.trim().length > 0
          ) {
            // Parse line ranges (can be comma-separated: "1-10,20-30")
            const lineRangeStrs = fileChange.lines
              .split(',')
              .map((s) => s.trim())
            const lineRanges: { start: number; end: number }[] = []

            for (const rangeStr of lineRangeStrs) {
              const range = parseLineRange(rangeStr)
              if (range) {
                lineRanges.push(range)
              }
            }

            if (lineRanges.length > 0) {
              // Extract specified line ranges
              contents[filePath] = extractLineRanges(fullContent, lineRanges)
            } else {
              // Invalid range, use full content
              contents[filePath] = fullContent
            }
          } else {
            // No line range specified, use full content
            contents[filePath] = fullContent
          }
        } else {
          contents[filePath] = fullContent
        }
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
