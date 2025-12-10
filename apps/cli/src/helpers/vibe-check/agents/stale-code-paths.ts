import { analyzeStaleCodePaths } from '@app/agents'
import { execa } from 'execa'
import path from 'path'

import {
  type VibeCheckAgent,
  type VibeCheckFinding,
  type VibeCheckResult,
} from '../types'

async function getLastTouchedDays(
  gitRoot: string,
  file: string,
): Promise<number | null> {
  try {
    const { stdout } = await execa(
      'git',
      ['log', '-1', '--format=%ct', '--', file],
      {
        cwd: gitRoot,
      },
    )
    if (!stdout.trim()) {
      return null
    }
    const lastTouchedSeconds = Number.parseInt(stdout.trim(), 10)
    if (Number.isNaN(lastTouchedSeconds)) {
      return null
    }

    const lastTouchedMs = lastTouchedSeconds * 1000
    const now = Date.now()
    return Math.floor((now - lastTouchedMs) / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

function toFindings(
  results: Awaited<ReturnType<typeof analyzeStaleCodePaths>>['findings'],
): VibeCheckFinding[] {
  return results.map((finding) => ({
    message: `${finding.file} last touched ${finding.lastTouchedDays ?? 'unknown'} days ago`,
    path: finding.file,
    suggestion: finding.reasoning,
    severity: finding.severity,
  }))
}

export const staleCodePathsAgent: VibeCheckAgent = {
  id: 'stale-code-paths',
  label: 'Stale code paths',
  description: 'Surface files that have not been changed recently',
  async run(context, reporter): Promise<VibeCheckResult> {
    if (context.changedFiles.length === 0) {
      return {
        status: 'pass',
        summary: 'No files to scan',
        findings: [],
      }
    }

    reporter.progress('Checking git history...')
    const files = await Promise.all(
      context.changedFiles.map(async (file) => ({
        path: file,
        lastTouchedDays: await getLastTouchedDays(context.gitRoot, file),
      })),
    )

    reporter.progress('Starting agent')
    const result = await analyzeStaleCodePaths({
      repo: {
        id: context.gitRoot,
        slug: path.basename(context.gitRoot),
      },
      files,
      options: {
        maxSteps: 8,
        progress: reporter.progress,
      },
    })

    const findings = toFindings(result.findings ?? [])

    if (findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No stale files detected',
        findings: [],
      }
    }

    const mostSevere = findings.some((finding) => finding.severity === 'error')
      ? 'fail'
      : findings.some((finding) => finding.severity === 'warn')
        ? 'warn'
        : 'pass'

    return {
      status: mostSevere,
      summary: `${findings.length} stale code path${findings.length > 1 ? 's' : ''} identified`,
      findings,
    }
  },
}
