import { Command } from 'commander'
import { render } from 'ink'
import React from 'react'

import Help from './commands/help'
import Init from './commands/init'
import Mcp from './commands/mcp'
import Plan from './commands/plan'
import Stage from './commands/stage'
import VibeCheck from './commands/vibe/check'
import { isExperimentalEnabled } from './helpers/config/get-ai-config'
import { handleError } from './helpers/error-handling/handle-error'
import { initializeCliLogFile } from './helpers/logging/cli-log-file'
import { createLogger } from './helpers/logging/logger'
import { ComingSoon } from './ui/coming-soon'

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
    .command('init')
    .description('Initialize Kyoto by configuring your AI provider and API key')
    .action(async () => {
      await renderCommand(<Init />)
    })

  program
    .command('mcp')
    .description('MCP command')
    .action(async () => {
      const experimental = await isExperimentalEnabled()
      if (!experimental) {
        await renderCommand(<ComingSoon />)
        return
      }
      await renderCommand(<Mcp />)
    })

  program
    .command('stage')
    .description(
      'Analyze uncommitted changes and suggest how to organize them into logical commits',
    )
    .action(async () => {
      await renderCommand(<Stage />)
    })

  program
    .command('plan')
    .description('View the current plan')
    .action(async () => {
      await renderCommand(<Plan />)
    })

  const vibeCommand = program.command('vibe').description('Vibe check commands')

  vibeCommand
    .command('check')
    .description('Test and diff user stories against staged changes')
    .option('--staged', 'Only check staged changes')
    .action(async (options: { staged?: boolean }) => {
      await renderCommand(<VibeCheck staged={options.staged} />)
    })

  program.showHelpAfterError()

  if (argv.length <= 2) {
    await renderCommand(<Help />)
    return
  }

  await program.parseAsync(argv)
}
