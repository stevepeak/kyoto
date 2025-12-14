import { Box, Text, useApp, useStdout } from 'ink'
import { useEffect } from 'react'

import { Footer } from '../../ui/footer'
import { Jumbo } from '../../ui/jumbo'

// Unified example type - always use objects with command and optional description
type CommandExample = {
  command: string
  description?: string
}

type HelpCommand = {
  name: string
  description: string
  examples: CommandExample[]
}

type CommandGroup = {
  title: string
  kanji?: string
  commands: HelpCommand[]
}

const commandGroups: CommandGroup[] = [
  {
    title: 'Vibing',
    kanji: '改善',
    commands: [
      {
        name: 'vibe check',
        description: 'Run several agents to ensure your code is in good shape',
        examples: [
          { command: 'kyoto vibe check', description: 'Check all changes' },
          {
            command: 'kyoto vibe check --staged',
            description: 'Check only staged changes',
          },
          {
            command: 'kyoto vibe check --watch',
            description:
              '(Coming soon) Continuously vibe check new git changes',
          },
        ],
      },
      {
        name: 'commit',
        description:
          'Use Kyoto AI to commit unstaged changes into logical commits',
        examples: [
          {
            command: 'kyoto commit',
            description: 'Create a commit plan, then commit it',
          },
          {
            command:
              'kyoto commit "group by feature, use conventional commits"',
            description:
              'Create a new commit plan using the provided instructions, then commit',
          },
        ],
      },
      {
        name: 'diff',
        description:
          'Analyze and summarize staged and unstaged git changes to understand what you are working on',
        examples: [
          {
            command: 'kyoto diff',
            description: 'Get a concise summary of your current changes',
          },
        ],
      },
      {
        name: 'test',
        description: 'Generate test suggestions for code changes',
        examples: [
          {
            command: 'kyoto test',
            description: 'Generate test suggestions for all changes',
          },
          {
            command: 'kyoto test --staged',
            description: 'Generate test suggestions for staged changes only',
          },
          {
            command: 'kyoto test --commits 4',
            description: 'Generate test suggestions for the last 4 commits',
          },
          {
            command: 'kyoto test --last',
            description: 'Generate test suggestions since last vibe check',
          },
        ],
      },
    ],
  },
  // TODO finish these later
  // {
  //   title: 'Tooling',
  //   kanji: '設定',
  //   commands: [
  //     {
  //       name: 'mcp',
  //       description: 'For your coding agent to vibe check themselves',
  //       examples: [{ command: 'kyoto mcp' }],
  //     },
  //   ],
  // },
  {
    title: 'Configuring',
    kanji: '設定',
    commands: [
      {
        name: 'login',
        description: 'Login via GitHub to get started',
        examples: [{ command: 'kyoto login' }],
      },
      // TODO finish these later
      // {
      //   name: 'setup',
      //   description: 'Configure your Kyoto experience',
      //   examples: [
      //     { command: 'kyoto setup github', description: 'Add a GitHub Action for Kyoto' },
      //     { command: 'kyoto setup mcp', description: 'Add Kyoto to your MCP services' },
      //   ],
      // },
      {
        name: 'docs',
        description: 'View the Kyoto documentation',
        examples: [{ command: 'kyoto docs' }],
      },
    ],
  },
]

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

function ExampleDisplay({
  example,
  columnWidth,
  isVertical,
}: {
  example: CommandExample
  columnWidth: number
  isVertical: boolean
}): React.ReactElement {
  if (isVertical) {
    return (
      <Box flexDirection="column">
        <Text>
          <Text dimColor>$ </Text>
          <Text color="yellow">{example.command}</Text>
        </Text>
        {example.description && (
          <Text dimColor wrap="truncate">
            {example.description}
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="row">
      <Text>{' '.repeat(columnWidth + 1)}</Text>
      <Text dimColor>$ </Text>
      <Text color="yellow">{example.command}</Text>
      {example.description && (
        <>
          <Text> </Text>
          <Text dimColor wrap="truncate">
            {example.description}
          </Text>
        </>
      )}
    </Box>
  )
}

function CommandDisplay({
  command,
  columnWidth,
  isVertical,
}: {
  command: HelpCommand
  columnWidth: number
  isVertical: boolean
}): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {isVertical ? (
        <Box flexDirection="column" gap={1}>
          <Text color="red">{command.name}</Text>
          <Text>{command.description}</Text>
        </Box>
      ) : (
        <Box gap={1}>
          <Text color="red">{command.name.padEnd(columnWidth)}</Text>
          <Text>{command.description}</Text>
        </Box>
      )}
      {command.examples.map((example, idx) => (
        <ExampleDisplay
          key={idx}
          example={example}
          columnWidth={columnWidth}
          isVertical={isVertical}
        />
      ))}
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

  const isVertical = terminalWidth < 80

  useEffect(() => {
    // Allow the render to flush before exiting
    setTimeout(() => {
      exit()
    }, 250)
  }, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Text> </Text>
      {commandGroups.map((group) => (
        <Box key={group.title} flexDirection="column" marginBottom={1}>
          <GroupHeader title={group.title} kanji={group.kanji} />
          <Text dimColor>{'─'.repeat(Math.min(terminalWidth - 2, 50))}</Text>
          <Text> </Text>

          {group.commands.map((command) => (
            <CommandDisplay
              key={command.name}
              command={command}
              columnWidth={columnWidth}
              isVertical={isVertical}
            />
          ))}

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
