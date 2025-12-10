import { Box, Text, useApp, useStdout } from 'ink'
import { useEffect } from 'react'

import { Footer } from '../ui/footer'
import { Jumbo } from '../ui/jumbo'

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
        comingSoon: true,
      },
      {
        name: 'stage',
        description: 'Use Kyoto AI to stage changes incrementally',
        example: 'kyoto stage',
        comingSoon: true,
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

export default function Help(): React.ReactElement {
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
      <Jumbo />
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
