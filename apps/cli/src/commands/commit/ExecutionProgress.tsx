import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React from 'react'

interface ExecutionProgressProps {
  progress: string
}

export function ExecutionProgress({
  progress,
}: ExecutionProgressProps): React.ReactElement {
  return (
    <Box marginTop={1} gap={1}>
      <Text color="red">
        <Spinner type="dots" />
      </Text>
      <Text>{progress}</Text>
    </Box>
  )
}
