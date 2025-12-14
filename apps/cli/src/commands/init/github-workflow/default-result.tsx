import { Box, Text } from 'ink'
import React from 'react'

export function DefaultResult(): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="green">✓</Text> GitHub Actions
      </Text>
    </Box>
  )
}
