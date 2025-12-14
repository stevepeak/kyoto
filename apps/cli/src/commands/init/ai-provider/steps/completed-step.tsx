import { Box, Text } from 'ink'
import React from 'react'

import type { CompletedStepProps } from '../types'

export function CompletedStep({
  model,
  providerLabel,
  logs,
}: CompletedStepProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="green">✓</Text> AI Provider
      </Text>
      {model && providerLabel ? (
        <Text>
          {'  '}
          <Text color="grey">- </Text>
          <Text color="cyan">{model}</Text>
          <Text color="grey"> via </Text>
          <Text color="yellow">{providerLabel}</Text>
        </Text>
      ) : null}
      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
    </Box>
  )
}
