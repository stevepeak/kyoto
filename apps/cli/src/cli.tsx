import { Command } from 'commander'
import { Box, render, Text, useApp, useStdout } from 'ink'
import React, { useEffect } from 'react'

import Init from './commands/init'
import Mcp from './commands/mcp'
import { isExperimentalEnabled } from './helpers/config/get-ai-config'
import { Header } from './helpers/display/display-header'
import { initializeCliLogFile } from './helpers/logging/cli-log-file'
import { Footer } from './ui/footer'

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
          // ['kyoto vibe check --watch', 'Contininously vibe check git changes'],
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

      <Footer />
      {/* some extra space */}
      <Text> </Text>
      <Text> </Text>
    </Box>
  )
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
    .action(async (options: { staged?: boolean }) => {
      const VibeCheck = (await import('./commands/vibe/check')).default
      await renderCommand(<VibeCheck staged={options.staged} />)
    })

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

  program.showHelpAfterError()

  if (argv.length <= 2) {
    await renderCommand(<Help />)
    return
  }

  await program.parseAsync(argv)
}
