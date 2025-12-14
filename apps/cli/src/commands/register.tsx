import { type Command } from 'commander'
import React from 'react'

import { renderCommand } from '../helpers/render-command'
import {
  addVibeCommandOptions,
  parseVibeCommandOptions,
  type VibeCommandRawOptions,
} from '../helpers/vibe-command-options'
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
    .action(async (instructions: string | undefined) => {
      await renderCommand({
        commandName: 'commit',
        element: <Commit instructions={instructions} />,
      })
    })

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

  addVibeCommandOptions(
    vibeCommand
      .command('check')
      .description('Check code for various issues before committing to github'),
  ).action(
    async (commitSpec: string | undefined, options: VibeCommandRawOptions) => {
      const props = parseVibeCommandOptions({ commitSpec, options })

      await renderCommand({
        commandName: 'vibe_check',
        commandOptions: props,
        element: <VibeCheck {...props} />,
      })
    },
  )

  program
    .command('test')
    .description('Interactive browser testing with AI agent')
    .action(async () => {
      await renderCommand({
        commandName: 'test',
        element: <Test />,
      })
    })
}
