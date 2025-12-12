import { findGitRoot, getGitHubInfo } from '@app/shell'
import { Command } from 'commander'
import { render } from 'ink'
import React from 'react'

import Commit from './commands/commit'
import Diff from './commands/diff'
import Docs from './commands/docs'
import Help from './commands/help'
import Login from './commands/login'
import { runMcpCommand } from './commands/mcp'
import Plan from './commands/plan'
import Setup from './commands/setup'
import SetupAi from './commands/setup-ai'
import SetupGithub from './commands/setup-github'
import SetupMcp from './commands/setup-mcp'
import VibeCheck from './commands/vibe/check'
import { CLI_VERSION } from './generated/version'
import { getCliAnalyticsContext } from './helpers/analytics/cli-analytics'
import {
  captureCliEvent,
  shutdownCliAnalytics,
} from './helpers/analytics/posthog'
import { handleError } from './helpers/error-handling/handle-error'
import { initializeCliLogFile } from './helpers/logging/cli-log-file'
import { createLogger } from './helpers/logging/logger'

async function renderCommand(args: {
  commandName: string
  commandOptions?: Record<string, unknown>
  element: React.ReactElement
}): Promise<void> {
  const analytics = await getCliAnalyticsContext()

  try {
    const app = render(args.element)
    if (analytics.enabled) {
      // Get GitHub slug for tracking (best effort, don't fail if unavailable)
      let repo: string | undefined
      try {
        const gitRoot = await findGitRoot()
        const githubInfo = await getGitHubInfo(gitRoot)
        if (githubInfo) {
          repo = `${githubInfo.owner}/${githubInfo.repo}`
        }
      } catch {
        // Ignore errors - GitHub info is optional for tracking
      }

      captureCliEvent({
        event: args.commandName,
        distinctId: analytics.distinctId,
        properties: {
          commandOptions: args.commandOptions ?? {},
          repo,
        },
      })
    }
    await app.waitUntilExit()
  } catch (error) {
    // Handle any unhandled errors at the top level
    const logger = createLogger()

    handleError(error, {
      logger,
      setExitCode: (code) => {
        process.exitCode = code
      },
    })
    process.exit(1)
  } finally {
    await shutdownCliAnalytics()
  }
}

export async function run(argv = process.argv): Promise<void> {
  // Check if we're in MCP mode - if so, skip CLI initialization that might output
  const isMcpMode = argv.includes('mcp') && !process.stdin.isTTY
  await initializeCliLogFile()
  const program = new Command()

  program.name('kyoto').description('Kyoto CLI').version(CLI_VERSION)

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
    .option(
      '--plan',
      'Generate and save a commit plan to .kyoto/commit-plan.json without committing',
    )
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
    .description('Check code for various issues before commiting to github')
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
    .option('--commits <count>', 'Check the last N commits (e.g., --commits 4)')
    .option('--commit <sha>', 'Check a specific commit by SHA')
    .action(
      async (
        commitSpec: string | undefined,
        options: {
          staged?: boolean
          timeout?: string
          commits?: string
          commit?: string
        },
      ) => {
        const timeoutMinutes = Number.parseFloat(options.timeout ?? '1')

        let commitCount: number | undefined
        let commitSha: string | undefined = options.commit

        // Parse commit specification from argument (e.g., -1, -4, or SHA)
        if (commitSpec) {
          // Check if it's a negative number (commit count)
          if (commitSpec.startsWith('-')) {
            const num = Number.parseInt(commitSpec, 10)
            if (!Number.isNaN(num) && num < 0) {
              commitCount = Math.abs(num)
            }
          } else {
            // Assume it's a commit SHA
            commitSha = commitSpec
          }
        }

        // Override with --commits flag if provided
        if (options.commits) {
          const count = Number.parseInt(options.commits, 10)
          if (!Number.isNaN(count) && count > 0) {
            commitCount = count
          }
        }

        await renderCommand({
          commandName: 'vibe_check',
          commandOptions: { ...options, commitCount, commitSha },
          element: (
            <VibeCheck
              staged={options.staged}
              timeoutMinutes={timeoutMinutes}
              commitCount={commitCount}
              commitSha={commitSha}
            />
          ),
        })
      },
    )

  // In MCP mode, don't show help on error - just exit silently
  if (!isMcpMode) {
    program.showHelpAfterError()
  }

  if (argv.length <= 2 && !isMcpMode) {
    await renderCommand({ commandName: 'help', element: <Help /> })
    return
  }

  await program.parseAsync(argv)
}
