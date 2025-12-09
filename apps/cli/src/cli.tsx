import { Command } from 'commander'
import { render } from 'ink'
import React from 'react'

import Clear from './commands/clear'
import Craft from './commands/craft'
import Discover from './commands/discover'
import Init from './commands/init'
import List from './commands/list'
import Mcp from './commands/mcp'
import Search from './commands/search'
import Test from './commands/test'
import TestApi from './commands/test/api'
import TestBrowser from './commands/test/browser'
import TestCli from './commands/test/cli'
import TestTrace from './commands/test/trace'
import Trace from './commands/trace'
import Vibe from './commands/vibe'

function parseInteger(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

async function renderCommand(element: React.ReactElement): Promise<void> {
  const app = render(element)
  await app.waitUntilExit()
}

export async function run(argv = process.argv): Promise<void> {
  const program = new Command()

  program.name('kyoto').description('Kyoto CLI')

  program
    .command('list')
    .alias('ls')
    .description('List all stories')
    .action(async () => {
      await renderCommand(<List />)
    })

  program
    .command('clear')
    .description('Clear all stories and vectra data, preserving details.json')
    .action(async () => {
      await renderCommand(<Clear />)
    })

  program
    .command('search <query>')
    .description('Search for stories using semantic similarity')
    .option('-k, --limit <limit>', 'Maximum number of stories to return', '10')
    .option(
      '-t, --threshold <threshold>',
      'Minimum similarity score threshold (0-1)',
    )
    .action(
      async (
        query: string,
        options: { limit?: string; threshold?: string },
      ) => {
        await renderCommand(
          <Search
            query={query}
            limit={parseInteger(options.limit)}
            threshold={options.threshold}
          />,
        )
      },
    )

  program
    .command('discover [folder]')
    .description('Generate behavior stories from a code file')
    .option(
      '-m, --model <model>',
      'Model to use (e.g., "gpt-4o-mini" or "openai/gpt-4o-mini")',
    )
    .option(
      '-p, --provider <provider>',
      'Provider to use: openai, vercel, or auto',
      'auto',
    )
    .option(
      '-l, --limit <limit>',
      'Maximum number of stories to discover before stopping',
    )
    .action(
      async (
        folder: string | undefined,
        options: {
          model?: string
          provider?: 'openai' | 'vercel' | 'auto'
          limit?: string
        },
      ) => {
        await renderCommand(
          <Discover
            folder={folder}
            model={options.model}
            provider={options.provider}
            limit={parseInteger(options.limit)}
          />,
        )
      },
    )

  program
    .command('init')
    .description('Initialize Kyoto by configuring your AI provider and API key')
    .action(async () => {
      await renderCommand(<Init />)
    })

  program
    .command('craft')
    .description('Craft stories or behaviors')
    .action(async () => {
      await renderCommand(<Craft />)
    })

  program
    .command('mcp')
    .description('MCP command')
    .action(async () => {
      await renderCommand(<Mcp />)
    })

  program
    .command('test')
    .description('Run tests')
    .action(async () => {
      await renderCommand(<Test />)
    })

  program
    .command('test:browser')
    .description('Run browser tests')
    .action(async () => {
      await renderCommand(<TestBrowser />)
    })

  program
    .command('test:api')
    .description('Run API tests')
    .action(async () => {
      await renderCommand(<TestApi />)
    })

  program
    .command('test:cli')
    .description('Run CLI tests')
    .action(async () => {
      await renderCommand(<TestCli />)
    })

  program
    .command('test:trace')
    .description('Run tests with trace')
    .action(async () => {
      await renderCommand(<TestTrace />)
    })

  program
    .command('trace [source]')
    .description(
      'List stories that have evidence pointing to the source lines asked to trace',
    )
    .action(async (source: string | undefined) => {
      await renderCommand(<Trace source={source} />)
    })

  program
    .command('vibe')
    .description('Monitor the working project commits and log new commits')
    .option(
      '-m, --max-length <maxLength>',
      'Maximum characters for commit message',
      '60',
    )
    .option(
      '-i, --interval <interval>',
      'Polling interval in milliseconds',
      '1000',
    )
    .action(async (options: { maxLength?: string; interval?: string }) => {
      await renderCommand(
        <Vibe
          maxLength={parseInteger(options.maxLength)}
          interval={parseInteger(options.interval)}
        />,
      )
    })

  program.showHelpAfterError()

  if (argv.length <= 2) {
    program.outputHelp()
    return
  }

  await program.parseAsync(argv)
}
