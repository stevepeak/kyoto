import { analyzeFunctionConsolidation } from '@app/agents'
import fs from 'fs/promises'
import path from 'path'

import {
  type VibeCheckAgent,
  type VibeCheckFinding,
  type VibeCheckResult,
} from '../types'

const MAX_FILE_BYTES = 8000

async function loadChangedFiles(
  gitRoot: string,
  files: string[],
): Promise<
  {
    path: string
    content: string
  }[]
> {
  const results: { path: string; content: string }[] = []

  for (const relativePath of files) {
    const absolutePath = path.join(gitRoot, relativePath)
    try {
      const raw = await fs.readFile(absolutePath, 'utf8')
      results.push({
        path: relativePath,
        content: raw.slice(0, MAX_FILE_BYTES),
      })
    } catch {
      continue
    }
  }

  return results
}

function toFindings(
  suggestions: Awaited<
    ReturnType<typeof analyzeFunctionConsolidation>
  >['suggestions'],
): VibeCheckFinding[] {
  return suggestions.map((suggestion) => {
    const functions = suggestion.functions
      .map((fn) => `${fn.name} (${fn.file})`)
      .join(' ↔ ')

    return {
      message: functions,
      path: suggestion.functions[0]?.file,
      suggestion: suggestion.reasoning,
      severity: 'warn',
    }
  })
}

export const functionConsolidationAgent: VibeCheckAgent = {
  id: 'function-consolidation',
  label: 'Function consolidation',
  description:
    'Highlight opportunities to merge or extract shared helpers from similar functions',
  async run(context, reporter): Promise<VibeCheckResult> {
    if (context.changedFiles.length === 0) {
      return {
        status: 'pass',
        summary: 'No files to scan',
        findings: [],
      }
    }

    reporter.progress('Preparing code for AI review...')
    const files = await loadChangedFiles(context.gitRoot, context.changedFiles)

    if (files.length === 0) {
      return {
        status: 'pass',
        summary: 'No readable files to scan',
        findings: [],
      }
    }

    reporter.progress('Starting agent')
    const result = await analyzeFunctionConsolidation({
      files,
      options: {
        maxSteps: 12,
        progress: reporter.progress,
      },
    })

    const findings = toFindings(result.suggestions ?? [])

    if (findings.length === 0) {
      context.logger('No obvious function consolidation opportunities found.')
      return {
        status: 'pass',
        summary: 'No consolidation targets detected',
        findings: [],
      }
    }

    context.logger('Possible consolidation targets:')
    for (const finding of findings) {
      context.logger(`- ${finding.message}: ${finding.suggestion ?? ''}`.trim())
    }

    return {
      status: 'warn',
      summary: `${findings.length} consolidation candidate${findings.length === 1 ? '' : 's'}`,
      findings,
    }
  },
}
