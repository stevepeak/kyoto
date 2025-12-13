import { Command } from 'commander'
import React from 'react'

import Help from './commands/help'
import { registerCommands } from './commands/register'
import { CLI_VERSION } from './generated/version'
import { initializeCliLogFile } from './helpers/logging/cli-log-file'
import { renderCommand } from './helpers/render-command'

export async function run(argv = process.argv): Promise<void> {
  // Check if we're in MCP mode - if so, skip CLI initialization that might output
  const isMcpMode = argv.includes('mcp') && !process.stdin.isTTY
  await initializeCliLogFile()
  const program = new Command()

  program.name('kyoto').description('Kyoto CLI').version(CLI_VERSION)

  registerCommands(program)

  // In MCP mode, don't show help on error - just exit silently
  if (!isMcpMode) {
    program.showHelpAfterError()
  }

  if (argv.length <= 2 && !isMcpMode) {
    await renderCommand({ commandName: 'help', element: <Help /> })
    process.exitCode = 0
    return
  }

  await program.parseAsync(argv)
}
