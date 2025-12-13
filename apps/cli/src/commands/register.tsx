import { parseCommitSpec } from '@app/shell'
import { type Command } from 'commander'
import React from 'react'

import { renderCommand } from '../helpers/render-command'
import Commit from './commit'
import Diff from './diff'
import Docs from './docs'
import Login from './login'
import { runMcpCommand } from './mcp'
import Plan from './plan'
import Setup from './setup'
import SetupAi from './setup/ai'
import SetupGithub from './setup/github'
import SetupMcp from './setup/mcp'
import Test from './test'
import VibeCheck from './vibe/check'

/**
 * Registers all CLI commands with the commander program.
 */
export function registerCommands(program: Command): void {
  const setupCommand = program
    // TODO finish these later
    .command('setup', { hidden: true })
    .description('Setup commands')

  setupCommand
    .command('mcp')
    .description('Add Kyoto to your MCP services')
    .action(async () => {
      await renderCommand({ commandName: 'setup_mcp', element: <SetupMcp /> })
    })

  setupCommand
    .command('github')
    .description('Add a GitHub Action for Kyoto')
    .action(async () => {
      await renderCommand({
        commandName: 'setup_github',
        element: <SetupGithub />,
      })
    })

  // Intentionally not listed in `help.tsx`
  setupCommand
    .command('ai')
    .description('Configure your AI provider and API key')
    .action(async () => {
      await renderCommand({ commandName: 'setup_ai', element: <SetupAi /> })
    })

  setupCommand.action(async () => {
    await renderCommand({ commandName: 'setup', element: <Setup /> })
  })

  program
    .command('login')
    .description('Login via browser using GitHub OAuth')
    .action(async () => {
      await renderCommand({ commandName: 'login', element: <Login /> })
    })

  program
    .command('mcp')
    .description('MCP command')
    .action(async () => {
      await runMcpCommand()
    })

  program
    .command('commit')
    .description('Plan and commit uncommitted changes into logical commits')
    .argument(
      '[instructions]',
      'Optional instructions to guide how Kyoto groups changes and writes commit messages',
    )
    .option('--plan', 'Preview a commit plan without committing')
    .action(
      async (instructions: string | undefined, options: { plan?: boolean }) => {
        await renderCommand({
          commandName: 'commit',
          commandOptions: options,
          element: (
            <Commit plan={options.plan ?? false} instructions={instructions} />
          ),
        })
      },
    )

  program
    .command('plan')
    .description('View the current plan')
    .action(async () => {
      await renderCommand({ commandName: 'plan', element: <Plan /> })
    })

  program
    .command('docs')
    .description('View the Kyoto documentation')
    .action(async () => {
      await renderCommand({ commandName: 'docs', element: <Docs /> })
    })

  program
    .command('diff')
    .description('Analyze and summarize staged and unstaged git changes')
    .action(async () => {
      await renderCommand({ commandName: 'diff', element: <Diff /> })
    })

  const vibeCommand = program.command('vibe').description('Vibe check commands')

  vibeCommand
    .command('check')
    .description('Check code for various issues before committing to github')
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
    .action(
      async (
        commitSpec: string | undefined,
        options: {
          staged?: boolean
          timeout?: string
          commits?: string
          commit?: string
          since?: string
          last?: boolean
        },
      ) => {
        const timeoutMinutes = Number.parseFloat(options.timeout ?? '1')
        const { commitCount, commitSha } = parseCommitSpec({
          commitSpec,
          commitsOption: options.commits,
          commitOption: options.commit,
        })

        await renderCommand({
          commandName: 'vibe_check',
          commandOptions: { ...options, commitCount, commitSha },
          element: (
            <VibeCheck
              staged={options.staged}
              timeoutMinutes={timeoutMinutes}
              commitCount={commitCount}
              commitSha={commitSha}
              sinceBranch={options.since}
              last={options.last}
            />
          ),
        })
      },
    )

  program
    .command('test')
    .description('Generate test suggestions for code changes')
    .argument(
      '[commit-spec]',
      'Commit specification: negative number for last N commits (e.g., -1, -4) or commit SHA',
    )
    .option('--staged', 'Only check staged changes')
    .option(
      '--timeout <minutes>',
      'Timeout for the agent in minutes (default: 1)',
      '1',
    )
    .option('--commits <count>', 'Check the last N commits (e.g., --commits 4)')
    .option('--commit <sha>', 'Check a specific commit by SHA')
    .option(
      '--since <branch>',
      'Check commits since a branch (e.g., --since main)',
    )
    .option('--last', 'Check commits since last vibe check')
    .action(
      async (
        commitSpec: string | undefined,
        options: {
          staged?: boolean
          timeout?: string
          commits?: string
          commit?: string
          since?: string
          last?: boolean
        },
      ) => {
        const timeoutMinutes = Number.parseFloat(options.timeout ?? '1')
        const { commitCount, commitSha } = parseCommitSpec({
          commitSpec,
          commitsOption: options.commits,
          commitOption: options.commit,
        })

        await renderCommand({
          commandName: 'test',
          commandOptions: { ...options, commitCount, commitSha },
          element: (
            <Test
              staged={options.staged}
              timeoutMinutes={timeoutMinutes}
              commitCount={commitCount}
              commitSha={commitSha}
              sinceBranch={options.since}
              last={options.last}
            />
          ),
        })
      },
    )
}
