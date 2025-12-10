import { Command } from 'commander'
import { Box, render, Text, useApp, useStdout } from 'ink'
import Link from 'ink-link'
import React, { useEffect } from 'react'

import Init from './commands/init'
import Mcp from './commands/mcp'
import { isExperimentalEnabled } from './helpers/config/get-ai-config'
import { Header } from './helpers/display/display-header'
import { initializeCliLogFile } from './helpers/logging/cli-log-file'

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
    title: 'Vibing',
    kanji: '改善',
    commands: [
      {
        name: 'vibe check',
        description: 'Test and diff user stories against staged changes',
        example: [
          ['kyoto vibe check', 'Check all changes'],
          ['kyoto vibe check --watch', 'Contininously vibe check git changes'],
          ['kyoto vibe check --staged', 'Check only staged changes'],
        ],
      },
      {
        name: 'vibe fix',
        description: 'Apply vibe fixes to your code',
        example: 'kyoto vibe fix',
      },
      {
        name: 'vibe plan',
        description: 'Create a plan for other agents to apply fixes',
        example: 'kyoto vibe plan',
      },
    ],
  },
  {
    title: 'Tooling',
    kanji: '設定',
    commands: [
      {
        name: 'mcp',
        description: 'For your coding agent to vibe check themselves',
        example: 'kyoto mcp',
      },
    ],
  },
  {
    title: 'Configuring',
    kanji: '設定',
    commands: [
      {
        name: 'init',
        description: 'Design your Kyoto experience',
        example: 'kyoto init',
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
  try {
    const app = render(element)
    await app.waitUntilExit()
  } catch (error) {
    // Handle any unhandled errors at the top level
    const { handleError } =
      await import('./helpers/error-handling/handle-error')
    const { createLogger } = await import('./helpers/logging/logger')
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

function ComingSoon(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    setTimeout(() => {
      exit()
    }, 0)
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header />
      <Text> </Text>
      <Text color="yellow">⚠️ This command is coming soon.</Text>
      <Text> </Text>
      <Text>
        To enable experimental features, add{' '}
        <Text color="yellow">"experimental": true</Text> to your{' '}
        <Text color="yellow">.kyoto/config.json</Text> file.
      </Text>
      <Text> </Text>
    </Box>
  )
}

function Help(): React.ReactElement {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const terminalWidth = stdout.columns || 80
  const columnWidth = Math.max(
    ...commandGroups.flatMap((group) =>
      group.commands.map((command) => command.name.length),
    ),
  )

  // Use vertical layout when terminal is narrow (less than 80 columns)
  const useVerticalLayout = terminalWidth < 80
  const minWidthForHorizontal = columnWidth + 20 // command name + description space

  useEffect(() => {
    // Allow the render to flush before exiting
    setTimeout(() => {
      exit()
    }, 0)
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header />
      <Text> </Text>
      {commandGroups.map((group) => (
        <Box key={group.title} flexDirection="column" marginBottom={1}>
          <GroupHeader
            title={group.title}
            kanji={(group as { kanji?: string }).kanji}
          />

          <Text dimColor>{'─'.repeat(Math.min(terminalWidth - 2, 50))}</Text>

          {group.commands.map((command) => {
            const isComingSoon = (command as { comingSoon?: boolean })
              .comingSoon
            const shouldUseVertical =
              useVerticalLayout || terminalWidth < minWidthForHorizontal

            return (
              <Box key={command.name} flexDirection="column">
                {shouldUseVertical ? (
                  <Box flexDirection="column">
                    <Text color={isComingSoon ? 'grey' : 'red'}>
                      {command.name}
                    </Text>
                    <Text>
                      {isComingSoon ? (
                        <>
                          <Text dimColor>(Coming soon) </Text>
                          {command.description}
                        </>
                      ) : (
                        command.description
                      )}
                    </Text>
                  </Box>
                ) : (
                  <Box>
                    <Text color={isComingSoon ? 'grey' : 'red'}>
                      {command.name.padEnd(columnWidth)}
                    </Text>
                    <Text>
                      {' '}
                      {isComingSoon ? (
                        <>
                          <Text dimColor>(Coming soon) </Text>
                          {command.description}
                        </>
                      ) : (
                        command.description
                      )}
                    </Text>
                  </Box>
                )}
                {'examples' in command && Array.isArray(command.examples) ? (
                  command.examples.map((example, idx) => {
                    const isTuple =
                      Array.isArray(example) &&
                      example.length === 2 &&
                      typeof example[0] === 'string' &&
                      typeof example[1] === 'string'
                    const commandText = isTuple ? example[0] : example
                    const description = isTuple ? example[1] : null
                    return (
                      <Box
                        key={idx}
                        flexDirection={shouldUseVertical ? 'column' : 'row'}
                      >
                        {shouldUseVertical ? (
                          <>
                            <Text>
                              <Text dimColor>$ </Text>
                              <Text color="yellow">{commandText}</Text>
                            </Text>
                            {description && <Text dimColor>{description}</Text>}
                          </>
                        ) : (
                          <>
                            <Text>{' '.repeat(columnWidth + 1)}</Text>
                            <Text dimColor>$ </Text>
                            <Text color="yellow">{commandText}</Text>
                            {description && (
                              <>
                                <Text> </Text>
                                <Text dimColor>{description}</Text>
                              </>
                            )}
                          </>
                        )}
                      </Box>
                    )
                  })
                ) : 'example' in command ? (
                  Array.isArray(command.example) ? (
                    command.example.map((example, idx) => {
                      const isTuple =
                        Array.isArray(example) &&
                        example.length === 2 &&
                        typeof example[0] === 'string' &&
                        typeof example[1] === 'string'
                      const commandText = isTuple ? example[0] : example
                      const description = isTuple ? example[1] : null
                      return (
                        <Box
                          key={idx}
                          flexDirection={shouldUseVertical ? 'column' : 'row'}
                        >
                          {shouldUseVertical ? (
                            <>
                              <Text>
                                <Text dimColor>$ </Text>
                                <Text color="yellow">{commandText}</Text>
                              </Text>
                              {description && (
                                <Text dimColor>{description}</Text>
                              )}
                            </>
                          ) : (
                            <>
                              <Text>{' '.repeat(columnWidth + 1)}</Text>
                              <Text dimColor>$ </Text>
                              <Text color="yellow">{commandText}</Text>
                              {description && (
                                <>
                                  <Text> </Text>
                                  <Text dimColor>{description}</Text>
                                </>
                              )}
                            </>
                          )}
                        </Box>
                      )
                    })
                  ) : typeof command.example === 'string' ? (
                    <Box flexDirection={shouldUseVertical ? 'column' : 'row'}>
                      {shouldUseVertical ? (
                        <Text>
                          <Text dimColor>$ </Text>
                          <Text color="yellow">{command.example}</Text>
                        </Text>
                      ) : (
                        <>
                          <Text>{' '.repeat(columnWidth + 1)}</Text>
                          <Text dimColor>$ </Text>
                          <Text color="yellow">{command.example}</Text>
                        </>
                      )}
                    </Box>
                  ) : null
                ) : null}
              </Box>
            )
          })}

          <Text> </Text>
        </Box>
      ))}

      <Box>
        <Text>
          <Text color="red">京</Text>
          {/* @ts-expect-error: Link type error intentionally ignored */}
          <Link url="https://usekyoto.com">
            <Text bold>Kyoto</Text>
          </Link>{' '}
          <Text color="grey">
            is crafted with intention on{' '}
            {/* @ts-expect-error: Link type error intentionally ignored */}
            <Link url="https://github.com/iopeak/kyoto">GitHub</Link>
          </Text>
        </Text>
      </Box>
      {/* some extra space */}
      <Text> </Text>
      <Text> </Text>
    </Box>
  )
}

function formatKyotoHelp(_program: Command): string {
  const columnWidth = Math.max(
    ...commandGroups.flatMap((group) =>
      group.commands.map((command) => command.name.length),
    ),
  )
  const lines: string[] = []

  // String version of header for Commander.js help output
  const headerRows = [
    '入   |  ',
    '京   |  ',
    '行   |  ',
    '改   |  ',
    '善   |  ',
  ]
  lines.push(
    headerRows
      .map(
        (row, index) =>
          `${colors.red(row)}${index === 2 ? colors.bold('Kyoto') : ''}`,
      )
      .join('\n'),
  )
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
      const isComingSoon = (command as { comingSoon?: boolean }).comingSoon
      const description = isComingSoon
        ? `${colors.dim('(Coming soon)')} ${command.description}`
        : command.description
      const nameColor = isComingSoon ? colors.dim : colors.red
      lines.push(`  ${nameColor(name)} ${description}`)
      if ('examples' in command && Array.isArray(command.examples)) {
        for (const example of command.examples) {
          const isTuple =
            Array.isArray(example) &&
            example.length === 2 &&
            typeof example[0] === 'string' &&
            typeof example[1] === 'string'
          const commandText = isTuple ? example[0] : example
          const description = isTuple ? example[1] : null
          if (description) {
            lines.push(
              `                               ${colors.dim('e.g.')} ${colors.yellow(commandText)} ${colors.dim(description)}`,
            )
          } else {
            lines.push(
              `                               ${colors.dim('e.g.')} ${colors.yellow(commandText)}`,
            )
          }
        }
      } else if ('example' in command) {
        if (Array.isArray(command.example)) {
          for (const example of command.example) {
            const isTuple =
              Array.isArray(example) &&
              example.length === 2 &&
              typeof example[0] === 'string' &&
              typeof example[1] === 'string'
            const commandText = isTuple ? example[0] : example
            const description = isTuple ? example[1] : null
            if (description) {
              lines.push(
                `                               ${colors.dim('e.g.')} ${colors.yellow(commandText)} ${colors.dim(description)}`,
              )
            } else {
              lines.push(
                `                               ${colors.dim('e.g.')} ${colors.yellow(commandText)}`,
              )
            }
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

  const vibeCommand = program.command('vibe').description('Vibe check commands')

  vibeCommand
    .command('check')
    .description('Test and diff user stories against staged changes')
    .option('--staged', 'Only check staged changes')
    .option('--watch', 'Continuously vibe check git changes')
    .option('--watch-commits', 'Watch for new commits and evaluate them')
    .option('--dry-run', 'Delay each stage for demo purposes')
    .option(
      '-m, --max-length <maxLength>',
      'Maximum characters for commit message (only with --watch-commits)',
      '60',
    )
    .option(
      '-i, --interval <interval>',
      'Polling interval in milliseconds (only with --watch-commits)',
      '1000',
    )
    .option(
      '-s, --simulate <count>',
      'Process the last N commits immediately (only with --watch-commits)',
    )
    .action(
      async (options: {
        staged?: boolean
        watch?: boolean
        watchCommits?: boolean
        dryRun?: boolean
        maxLength?: string
        interval?: string
        simulate?: string
      }) => {
        const Stage = (await import('./commands/vibe/check')).default
        await renderCommand(
          <Stage
            staged={options.staged}
            watch={options.watch}
            watchCommits={options.watchCommits}
            dryRun={options.dryRun}
            maxLength={parseInteger(options.maxLength)}
            interval={parseInteger(options.interval)}
            simulateCount={parseInteger(options.simulate)}
          />,
        )
      },
    )

  vibeCommand
    .command('fix')
    .description('Apply vibe fixes to your code')
    .action(async () => {
      const Fix = (await import('./commands/vibe/fix')).default
      await renderCommand(<Fix />)
    })

  vibeCommand
    .command('plan')
    .description('Create a plan for other agents to apply fixes')
    .action(async () => {
      const Plan = (await import('./commands/vibe/plan')).default
      await renderCommand(<Plan />)
    })

  program.helpInformation = () => formatKyotoHelp(program)
  program.showHelpAfterError()

  if (argv.length <= 2) {
    await renderCommand(<Help />)
    return
  }

  await program.parseAsync(argv)
}
