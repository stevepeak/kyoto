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

  program
    .command('setup')
    .description('Initialize Kyoto by configuring your AI provider and API key')
    .action(async () => {
      await renderCommand(<Setup />)
    })

  program
    .command('mcp')
    .description('MCP command')
    .action(async () => {
      await renderCommand(<Mcp />)
    })

  program
    .command('commit')
    .description(
      'Analyze uncommitted changes and suggest how to organize them into logical commits',
    )
    .option(
      '--dry-run',
      'List the commit plan without making any changes (default behavior)',
    )
    .action(async (options: { dryRun?: boolean }) => {
      await renderCommand(<Commit dryRun={options.dryRun ?? true} />)
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

  program
    .command('login')
    .description('Log in to Kyoto via the web (GitHub OAuth)')
    .option(
      '--app-url <url>',
      'Kyoto web app URL (default: $KYOTO_WEB_URL or http://localhost:3002)',
    )
    .action(async (options: { appUrl?: string }) => {
      await renderCommand(<Login appUrl={options.appUrl} />)
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
