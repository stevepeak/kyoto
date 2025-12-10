import fs from 'fs/promises'
import path from 'path'

import {
  type VibeCheckAgent,
  type VibeCheckFinding,
  type VibeCheckResult,
} from '../types'

const LARGE_FILE_LINE_COUNT = 500

async function getLineCount(filePath: string): Promise<number | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return content.split('\n').length
  } catch {
    return null
  }
}

export const largeFilesAgent: VibeCheckAgent = {
  id: 'large-files',
  label: 'Large files',
  description: 'Highlight unusually large files in the change set',
  async run(context, reporter): Promise<VibeCheckResult> {
    if (context.changedFiles.length === 0) {
      return {
        status: 'pass',
        summary: 'No files to scan',
        findings: [],
      }
    }

    reporter.progress('Measuring file sizes...')
    const findings: VibeCheckFinding[] = []

    for (const relativePath of context.changedFiles) {
      const absolutePath = path.join(context.gitRoot, relativePath)
      const lineCount = await getLineCount(absolutePath)
      if (lineCount === null) {
        continue
      }

      if (lineCount >= LARGE_FILE_LINE_COUNT) {
        findings.push({
          message: `${relativePath} is ${lineCount.toLocaleString()} lines`,
          path: relativePath,
          suggestion: 'Consider splitting this file into smaller modules.',
          severity: lineCount >= LARGE_FILE_LINE_COUNT * 1.5 ? 'error' : 'warn',
        })
      }
    }

    if (findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No large files detected',
        findings: [],
      }
    }

    const mostSevere = findings.some((finding) => finding.severity === 'error')
      ? 'fail'
      : 'warn'

    return {
      status: mostSevere,
      summary: `${findings.length} large file${findings.length > 1 ? 's' : ''} flagged`,
      findings,
    }
  },
}
