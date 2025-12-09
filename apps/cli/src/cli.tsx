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

const colors = {
  red: (text: string): string => `\x1b[31m${text}\x1b[0m`,
  magenta: (text: string): string => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string): string => `\x1b[36m${text}\x1b[0m`,
  yellow: (text: string): string => `\x1b[33m${text}\x1b[0m`,
  dim: (text: string): string => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string): string => `\x1b[1m${text}\x1b[0m`,
}

const commandGroups = [
  {
    title: 'Vibe',
    accent: colors.dim,
    commands: [
      {
        name: 'vibe',
        description: 'Monitor the working project commits and log new commits',
        example: 'kyoto vibe',
      },
      {
        name: 'vibe check',
        description:
          'Evaluate staged changes for impacted stories before committing',
        example: 'kyoto vibe check',
      },
      {
        name: 'vibe check --include-unstaged',
        description:
          'Evaluate unstaged changes (including untracked files) for impacted stories',
        example: 'kyoto vibe check --include-unstaged',
      },
    ],
  },
  {
    title: 'Stories',
    accent: colors.dim,
    commands: [
      {
        name: 'craft',
        description: 'Craft stories or behaviors',
        example: 'kyoto craft',
      },
      {
        name: 'list|ls',
        description: 'List all stories',
        example: 'kyoto list',
      },
      {
        name: 'search <query>',
        description: 'Search for stories using semantic similarity',
        example: 'kyoto search "login timeout" --limit 5',
      },
      {
        name: 'trace [source]',
        description:
          'List stories that have evidence pointing to the source lines asked to trace',
        example: 'kyoto trace src/auth.ts',
      },
    ],
  },
  {
    title: 'Test',
    accent: colors.dim,
    commands: [
      {
        name: 'test',
        description: 'Run tests',
        examples: [
          'kyoto test',
          'kyoto test:browser',
          'kyoto test:api',
          'kyoto test:cli',
          'kyoto test:trace',
        ],
      },
    ],
  },
  {
    title: 'Setup',
    accent: colors.dim,
    commands: [
      {
        name: 'init',
        description:
          'Initialize Kyoto by configuring your AI provider and API key',
        example: 'kyoto init',
      },
      {
        name: 'discover [folder]',
        description: 'Generate behavior stories from a code file',
        example: 'kyoto discover . --limit 5',
      },
      {
        name: 'clear',
        description:
          'Clear all stories and vectra data, preserving config.json',
        example: 'kyoto clear',
      },
      {
        name: 'mcp',
        description: 'MCP command',
        example: 'kyoto mcp',
      },
    ],
  },
  {
    title: 'Help',
    accent: colors.dim,
    commands: [
      {
        name: 'help [command]',
        description: 'Display help for a specific command',
        example: 'kyoto help trace',
      },
    ],
  },
] as const

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

function formatKyotoHeader(message = 'Kyoto'): string {
  const rows = ['入   |  ', '京   |  ', '行   |  ', '改   |  ', '善   |  ']
  return rows
    .map(
      (row, index) =>
        `${colors.red(row)}${index === 2 ? colors.bold(message) : ''}`,
    )
    .join('\n')
}

function formatKyotoHelp(program: Command): string {
  const longestName = Math.max(
    ...commandGroups.flatMap((group) =>
      group.commands.map((command) => command.name.length),
    ),
  )
  const lines: string[] = []

  lines.push(formatKyotoHeader())
  lines.push('')
  lines.push(`${colors.bold('Kyoto CLI')} — behavior-driven stories and tests`)
  lines.push(`Usage: ${colors.red(`${program.name()} [command]`)}`)
  lines.push('')

  for (const group of commandGroups) {
    lines.push(group.accent(group.title))
    for (const command of group.commands) {
      const name = command.name.padEnd(longestName)
      lines.push(`  ${colors.red(name)} ${command.description}`)
      if ('examples' in command && Array.isArray(command.examples)) {
        for (const example of command.examples) {
          lines.push(`    ${colors.dim('e.g.')} ${colors.yellow(example)}`)
        }
      } else if ('example' in command) {
        lines.push(
          `    ${colors.dim('e.g.')} ${colors.yellow(command.example)}`,
        )
      }
    }
    lines.push('')
  }

  lines.push(colors.dim('Global options'))
  lines.push(`  ${colors.red('-h, --help')} Show help for command`)
  lines.push('')

  return lines.join('\n')
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
    .description('Clear all stories and vectra data, preserving config.json')
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
    .option('--headless', 'Run browser in headless mode')
    .action(async (options: { headless?: boolean }) => {
      await renderCommand(<TestBrowser headless={options.headless ?? false} />)
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

  const vibeCommand = program
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
    .option(
      '-s, --simulate <count>',
      'Process the last N commits immediately as if they were just made',
    )
    .action(
      async (options: {
        maxLength?: string
        interval?: string
        simulate?: string
      }) => {
        await renderCommand(
          <Vibe
            maxLength={parseInteger(options.maxLength)}
            interval={parseInteger(options.interval)}
            simulateCount={parseInteger(options.simulate)}
          />,
        )
      },
    )

  vibeCommand
    .command('check')
    .description(
      'Evaluate staged changes for impacted stories before committing',
    )
    .option(
      '--include-unstaged',
      'Include unstaged changes and untracked files in the evaluation',
    )
    .action(async (options: { includeUnstaged?: boolean }) => {
      const Stage = (await import('./commands/stage')).default
      await renderCommand(<Stage includeUnstaged={options.includeUnstaged} />)
    })

  program.helpInformation = () => formatKyotoHelp(program)
  program.showHelpAfterError()

  if (argv.length <= 2) {
    program.outputHelp()
    return
  }

  await program.parseAsync(argv)
}
