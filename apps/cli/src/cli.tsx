import { Command } from 'commander'
import { render } from 'ink'
import React from 'react'

import Commit from './commands/commit'
import Docs from './commands/docs'
import Help from './commands/help'
import Login from './commands/login'
import Mcp from './commands/mcp'
import Plan from './commands/plan'
import Setup from './commands/setup'
import SetupAi from './commands/setup-ai'
import SetupGithub from './commands/setup-github'
import SetupMcp from './commands/setup-mcp'
import VibeCheck from './commands/vibe/check'
import { handleError } from './helpers/error-handling/handle-error'
import { initializeCliLogFile } from './helpers/logging/cli-log-file'
import { createLogger } from './helpers/logging/logger'

async function renderCommand(element: React.ReactElement): Promise<void> {
  try {
    const app = render(element)
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
  }
}

export async function run(argv = process.argv): Promise<void> {
  await initializeCliLogFile()
  const program = new Command()

  program.name('kyoto').description('Kyoto CLI')

  const setupCommand = program
    // TODO finish these later
    .command('setup', { hidden: true })
    .description('Setup commands')

  setupCommand
    .command('mcp')
    .description('Add Kyoto to your MCP services')
    .action(async () => {
      await renderCommand(<SetupMcp />)
    })

  setupCommand
    .command('github')
    .description('Add a GitHub Action for Kyoto')
    .action(async () => {
      await renderCommand(<SetupGithub />)
    })

  // Intentionally not listed in `help.tsx`
  setupCommand
    .command('ai')
    .description('Configure your AI provider and API key')
    .action(async () => {
      await renderCommand(<SetupAi />)
    })

  setupCommand.action(async () => {
    await renderCommand(<Setup />)
  })

  program
    .command('login')
    .description('Login via browser using GitHub OAuth')
    .action(async () => {
      await renderCommand(<Login />)
    })

  program
    .command('mcp')
    .description('MCP command')
    .action(async () => {
      await renderCommand(<Mcp />)
    })

  program
    .command('commit')
    .description('Plan and commit uncommitted changes into logical commits')
    .option(
      '--plan',
      'Generate and save a commit plan to .kyoto/commit-plan.json without committing',
    )
    .action(async (options: { plan?: boolean }) => {
      await renderCommand(<Commit plan={options.plan ?? false} />)
    })

  program
    .command('plan')
    .description('View the current plan')
    .action(async () => {
      await renderCommand(<Plan />)
    })

  program
    .command('docs')
    .description('View the Kyoto documentation')
    .action(async () => {
      await renderCommand(<Docs />)
    })

  const vibeCommand = program.command('vibe').description('Vibe check commands')

  vibeCommand
    .command('check')
    .description('Test and diff user stories against staged changes')
    .option('--staged', 'Only check staged changes')
    .option(
      '--timeout <minutes>',
      'Timeout for each agent in minutes (default: 1)',
      '1',
    )
    .action(async (options: { staged?: boolean; timeout?: string }) => {
      const timeoutMinutes = Number.parseFloat(options.timeout ?? '1')
      await renderCommand(
        <VibeCheck staged={options.staged} timeoutMinutes={timeoutMinutes} />,
      )
    })

  program.showHelpAfterError()

  if (argv.length <= 2) {
    await renderCommand(<Help />)
    return
  }

  await program.parseAsync(argv)
}
