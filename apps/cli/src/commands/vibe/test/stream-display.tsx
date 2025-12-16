import { Box, Text } from 'ink'
import React from 'react'

import { Markdown } from '../../../helpers/markdown'
import { type StreamItem } from './types'

type StreamDisplayProps = {
  stream: StreamItem[]
}

export function StreamDisplay({
  stream,
}: StreamDisplayProps): React.ReactElement {
  return (
    <Box marginTop={1} flexDirection="column">
      {stream.map((item) => (
        <StreamItemRow key={item.id} item={item} />
      ))}
    </Box>
  )
}

function StreamItemRow({ item }: { item: StreamItem }): React.ReactElement {
  if (item.type === 'divider') {
    return (
      <Box marginY={1}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>
    )
  }

  if (item.type === 'agent') {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text color="green" bold>
          Agent:
        </Text>
        <Box paddingLeft={2}>
          <Markdown>{item.text}</Markdown>
        </Box>
      </Box>
    )
  }

  if (item.type === 'test-result') {
    const badge = item.passed ? '✓' : '✗'
    const badgeColor = item.passed ? 'green' : 'red'
    const borderColor = item.passed ? 'green' : 'red'

    return (
      <Box
        marginTop={1}
        flexDirection="column"
        paddingX={1}
        borderStyle="round"
        borderColor={borderColor}
      >
        <Box marginBottom={1}>
          <Text color={badgeColor}>{badge} </Text>
          <Text bold color="cyan">
            {item.description}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color="yellow" bold>
            Steps:
          </Text>
          {item.steps.map((step, stepIndex) => (
            <Box key={`${item.id}-step-${stepIndex}`} marginLeft={2}>
              <Text dimColor>
                {stepIndex + 1}. {step}
              </Text>
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray" bold>
            Result:
          </Text>
          <Box marginLeft={2}>
            <Markdown>{item.response}</Markdown>
          </Box>
        </Box>
      </Box>
    )
  }

  // type === 'log'
  return (
    <Text color={item.color} dimColor={item.dim}>
      {item.text}
    </Text>
  )
}
