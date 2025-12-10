import { execa } from 'execa'

import {
  type VibeCheckAgent,
  type VibeCheckFinding,
  type VibeCheckResult,
} from '../types'

const STALE_DAYS_THRESHOLD = 180

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
    const findings: VibeCheckFinding[] = []

    for (const file of context.changedFiles) {
      const days = await getLastTouchedDays(context.gitRoot, file)
      if (days === null) {
        continue
      }

      if (days >= STALE_DAYS_THRESHOLD) {
        findings.push({
          message: `${file} last touched ${days} days ago`,
          path: file,
          suggestion:
            'Re-evaluate assumptions; add tests or refactors to reduce regression risk.',
          severity: days >= STALE_DAYS_THRESHOLD * 2 ? 'error' : 'warn',
        })
      }
    }

    if (findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No stale files detected',
        findings: [],
      }
    }

    const mostSevere = findings.some((finding) => finding.severity === 'error')
      ? 'fail'
      : 'warn'

    return {
      status: mostSevere,
      summary: `${findings.length} stale code path${findings.length > 1 ? 's' : ''} identified`,
      findings,
    }
  },
}
