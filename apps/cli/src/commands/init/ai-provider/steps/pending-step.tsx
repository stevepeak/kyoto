import { Box, Text } from 'ink'
import React from 'react'

export function PendingStep(): React.ReactElement {
  return (
    <Box marginTop={1}>
      <Text color="grey">• Configure AI provider</Text>
    </Box>
  )
}
