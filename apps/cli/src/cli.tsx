import { Command } from 'commander'
import { Box, render, Text, useApp } from 'ink'
import Link from 'ink-link'
import React, { useEffect } from 'react'

import Clear from './commands/clear'
import Craft from './commands/craft'
import Discover from './commands/discover'
import Init from './commands/init'
import List from './commands/list'
import Mcp from './commands/mcp'
import Search from './commands/search'
import SetupGithub from './commands/setup/github'
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
    title: 'Continuous Vibe Testing',
    kanji: '改善',
    commands: [
      {
        name: 'vibe',
        description:
          'Maintain and test user stories continuously upon new git commits.',
        example: 'kyoto vibe',
      },
      {
        name: 'vibe check',
        description:
          'Test and diff user stories against staged changes (not yet commited).',
        example: 'kyoto vibe check',
      },
    ],
  },
  {
    title: 'Stories',
    kanji: '物語',
    commands: [
      {
        name: 'craft',
        description: 'Create or refine a user story with AI.',
        example: 'kyoto craft',
      },
      {
        name: 'list',
        description: 'List stories in the current project.',
        example: 'kyoto list',
      },
      {
        name: '<query>',
        description: 'Search stories by natural language query.',
        example: 'kyoto "how do customers login?"',
      },
      {
        name: 'trace [story]',
        description: 'Display all the code required to fulfill a user story.',
        example: 'kyoto trace [story]',
      },
    ],
  },
  {
    title: 'Test',
    kanji: '試験',
    commands: [
      {
        name: 'test',
        description: 'Run tests for all stories.',
        example: 'kyoto test',
      },
      {
        name: 'test:browser',
        description: 'Run browser tests.',
        example: ['kyoto test:browser', 'kyoto test:browser --headless'],
      },
      {
        name: 'test:cli',
        description: 'Run CLI tests.',
        example: 'kyoto test:cli',
      },
      {
        name: 'test:trace',
        description: 'Run tests with trace.',
        example: 'kyoto test:trace',
      },
    ],
  },
  {
    title: 'Setup',
    kanji: '設定',
    commands: [
      {
        name: 'init',
        description: 'Configure AI provider & API key.',
        example: 'kyoto init',
      },
      {
        name: 'setup github',
        description: 'Create GitHub workflow for Kyoto tests.',
        example: 'kyoto setup github',
      },
      {
        name: 'discover',
        description: 'Generate new stories from code.',
        example: ['kyoto discover', 'kyoto discover apps/web --limit 3'],
      },
      {
        name: 'mcp',
        description: "Run Kyoto's MCP service for AI agent story exploration.",
        example: 'kyoto mcp',
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

function GroupHeader({
  title,
  kanji,
}: {
  title: string
  kanji?: string
}): React.ReactElement {
  return (
    <Box flexDirection="row" gap={1}>
      {kanji && <Text color="red">{kanji}</Text>}
      <Text>{title}</Text>
    </Box>
  )
}

function Help(): React.ReactElement {
  const { exit } = useApp()
  const columnWidth = Math.max(
    ...commandGroups.flatMap((group) =>
      group.commands.map((command) => command.name.length),
    ),
  )

  useEffect(() => {
    // Allow the render to flush before exiting
    setTimeout(() => {
      exit()
    }, 0)
  }, [exit])

  return (
    <Box flexDirection="column">
      <Text>{formatKyotoHeader()}</Text>
      <Text> </Text>
      <Text color="gray" italic>
        The way of the vibe.
      </Text>
      <Text> </Text>

      {commandGroups.map((group) => (
        <Box key={group.title} flexDirection="column" marginBottom={1}>
          <GroupHeader
            title={group.title}
            kanji={(group as { kanji?: string }).kanji}
          />

          <Text dimColor>
            ──────────────────────────────────────────────────
          </Text>

          {group.commands.map((command) => (
            <Box key={command.name} flexDirection="column">
              <Box>
                <Text color="red">{command.name.padEnd(columnWidth)}</Text>
                <Text> {command.description}</Text>
              </Box>
              {'examples' in command && Array.isArray(command.examples) ? (
                command.examples.map((example) => (
                  <Box key={example}>
                    <Text>{' '.repeat(columnWidth + 1)}</Text>
                    <Text dimColor>e.g. </Text>
                    <Text color="yellow">{example}</Text>
                  </Box>
                ))
              ) : 'example' in command ? (
                Array.isArray(command.example) ? (
                  command.example.map((example) => (
                    <Box key={example}>
                      <Text>{' '.repeat(columnWidth + 1)}</Text>
                      <Text dimColor>e.g. </Text>
                      <Text color="yellow">{example}</Text>
                    </Box>
                  ))
                ) : (
                  <Box>
                    <Text>{' '.repeat(columnWidth + 1)}</Text>
                    <Text dimColor>e.g. </Text>
                    <Text color="yellow">{command.example}</Text>
                  </Box>
                )
              ) : null}
            </Box>
          ))}

          <Text> </Text>
        </Box>
      ))}

      <Box>
        <Text>
          <Link url="https://usekyoto.com">
            <Text color="red">Kyoto</Text>
          </Link>{' '}
          <Text color="grey">
            is crafted with intention by{' '}
            <Link url="https://x.com/iopeak">@iopeak</Link>
          </Text>
        </Text>
      </Box>
      {/* some extra space */}
      <Text> </Text>
      <Text> </Text>
    </Box>
  )
}

function formatKyotoHelp(program: Command): string {
  const columnWidth = Math.max(
    ...commandGroups.flatMap((group) =>
      group.commands.map((command) => command.name.length),
    ),
  )
  const lines: string[] = []

  lines.push(formatKyotoHeader())
  lines.push('')
  lines.push(`Contininous vibe testing.`)
  lines.push('')

  for (const group of commandGroups) {
    const accent =
      (group as { accent?: typeof colors.dim }).accent ?? colors.dim
    lines.push(
      `${accent('─'.repeat(10))}  ${group.title}  ${accent('─'.repeat(10))}`,
    )
    for (const command of group.commands) {
      const name = command.name.padEnd(columnWidth)
      lines.push(`  ${colors.red(name)} ${command.description}`)
      if ('examples' in command && Array.isArray(command.examples)) {
        for (const example of command.examples) {
          lines.push(
            `                               ${colors.dim('e.g.')} ${colors.yellow(example)}`,
          )
        }
      } else if ('example' in command) {
        if (Array.isArray(command.example)) {
          for (const example of command.example) {
            lines.push(
              `                               ${colors.dim('e.g.')} ${colors.yellow(example)}`,
            )
          }
        } else if (typeof command.example === 'string') {
          lines.push(
            `                               ${colors.dim('e.g.')} ${colors.yellow(command.example)}`,
          )
        }
      }
    }
    lines.push('')
  }

  lines.push(
    `${colors.dim('─'.repeat(10))}  Global Options  ${colors.dim('─'.repeat(10))}`,
  )
  lines.push(`  ${colors.red('-h, --help')}                 Show help.`)
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

  // Handle unmatched commands as search queries
  program.on('command:*', async (operands) => {
    const query = operands[0]
    if (!query) {
      program.help()
      return
    }

    // Create a temporary command to parse options
    const searchCmd = new Command()
    searchCmd
      .option(
        '-k, --limit <limit>',
        'Maximum number of stories to return',
        '10',
      )
      .option(
        '-t, --threshold <threshold>',
        'Minimum similarity score threshold (0-1)',
      )

    // Parse the remaining arguments as options
    const remainingArgs = operands.slice(1)
    const parsed = searchCmd.parse(['', '', ...remainingArgs], { from: 'user' })
    const options = parsed.opts() as { limit?: string; threshold?: string }

    await renderCommand(
      <Search
        query={query}
        limit={parseInteger(options.limit)}
        threshold={options.threshold}
      />,
    )
  })

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

  const setupCommand = program
    .command('setup')
    .description('Setup commands for Kyoto')

  setupCommand
    .command('github')
    .description('Create GitHub workflow for running Kyoto tests')
    .action(async () => {
      await renderCommand(<SetupGithub />)
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
    await renderCommand(<Help />)
    return
  }

  // List of known commands
  const knownCommands = [
    'list',
    'ls',
    'clear',
    'discover',
    'init',
    'craft',
    'mcp',
    'setup',
    'test',
    'test:browser',
    'test:api',
    'test:cli',
    'test:trace',
    'trace',
    'vibe',
    'help',
    '--help',
    '-h',
  ]

  // Check if first argument is a known command
  const firstArg = argv[2]
  const isKnownCommand =
    knownCommands.includes(firstArg) || firstArg?.startsWith('test:')

  // Helper function to parse search options from argv
  const parseSearchOptions = (
    args: string[],
  ): { limit?: string; threshold?: string } => {
    const options: { limit?: string; threshold?: string } = {}
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === '-k' || arg === '--limit') {
        options.limit = args[i + 1]
        i++
      } else if (arg === '-t' || arg === '--threshold') {
        options.threshold = args[i + 1]
        i++
      } else if (arg.startsWith('--limit=')) {
        options.limit = arg.split('=')[1]
      } else if (arg.startsWith('--threshold=')) {
        options.threshold = arg.split('=')[1]
      } else if (arg.startsWith('-k') && arg.length > 2) {
        options.limit = arg.slice(2)
      } else if (arg.startsWith('-t') && arg.length > 2) {
        options.threshold = arg.slice(2)
      }
    }
    return options
  }

  // If not a known command, treat it as a search query
  if (!isKnownCommand && firstArg) {
    const remainingArgs = argv.slice(3)
    const options = parseSearchOptions(remainingArgs)
    // Default limit to 10 if not provided
    const limit = options.limit ? parseInteger(options.limit) : 10

    await renderCommand(
      <Search query={firstArg} limit={limit} threshold={options.threshold} />,
    )
    return
  }

  // Handle unmatched commands as search queries (fallback)
  program.on('command:*', async (operands) => {
    const query = operands[0]
    if (!query) {
      program.help()
      return
    }

    const remainingArgs = operands.slice(1)
    const options = parseSearchOptions(remainingArgs)
    // Default limit to 10 if not provided
    const limit = options.limit ? parseInteger(options.limit) : 10

    await renderCommand(
      <Search query={query} limit={limit} threshold={options.threshold} />,
    )
  })

  await program.parseAsync(argv)
}
