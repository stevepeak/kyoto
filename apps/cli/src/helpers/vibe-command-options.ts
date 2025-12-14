import { parseCommitSpec } from '@app/shell'
import { type Command } from 'commander'

/**
 * Raw options from commander for vibe-like commands (vibe check, test).
 */
export type VibeCommandRawOptions = {
  staged?: boolean
  timeout?: string
  commits?: string
  commit?: string
  since?: string
  last?: boolean
}

/**
 * Parsed props ready to pass to vibe-like components.
 */
type VibeCommandProps = {
  staged?: boolean
  timeoutMinutes: number
  commitCount?: number
  commitSha?: string
  sinceBranch?: string
  last?: boolean
}

/**
 * Adds common vibe-like command options to a commander command.
 * Used by both 'vibe check' and 'test' commands.
 */
export function addVibeCommandOptions(command: Command): Command {
  return command
    .argument(
      '[commit-spec]',
      'Commit specification: negative number for last N commits (e.g., -1, -4) or commit SHA',
    )
    .option('--staged', 'Only check staged changes')
    .option(
      '--timeout <minutes>',
      'Timeout for each agent in minutes (default: 1)',
      '1',
    )
    .option(
      '--commits <count>',
      'Check the last N commits (e.g., --commits 4 or simply -4)',
    )
    .option('--commit <sha>', 'Check a specific commit by SHA')
    .option(
      '--since <branch>',
      'Check commits since a branch (e.g., --since main)',
    )
    .option('--last', 'Check commits since last vibe check')
}

/**
 * Parses raw commander options into props for vibe-like components.
 */
export function parseVibeCommandOptions(args: {
  commitSpec: string | undefined
  options: VibeCommandRawOptions
}): VibeCommandProps {
  const { commitSpec, options } = args
  const timeoutMinutes = Number.parseFloat(options.timeout ?? '1')
  const { commitCount, commitSha } = parseCommitSpec({
    commitSpec,
    commitsOption: options.commits,
    commitOption: options.commit,
  })

  return {
    staged: options.staged,
    timeoutMinutes,
    commitCount,
    commitSha,
    sinceBranch: options.since,
    last: options.last,
  }
}
