import { Box, Text } from 'ink'
import React from 'react'

import type { StreamItem } from './types'

type StreamDisplayProps = {
  stream: StreamItem[]
}

export function StreamDisplay({
  stream,
}: StreamDisplayProps): React.ReactElement {
  return (
    <Box marginTop={1} flexDirection="column">
      {stream.map((item, i) => (
        <StreamItemRow key={i} item={item} />
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
          <Text>{item.text}</Text>
        </Box>
      </Box>
    )
  }

  if (item.type === 'test-result') {
    return (
      <Box gap={1}>
        <Text color={item.passed ? 'green' : 'red'}>
          {item.passed ? '✓' : '✗'}
        </Text>
        <Text color={item.passed ? 'green' : 'red'}>{item.description}</Text>
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
