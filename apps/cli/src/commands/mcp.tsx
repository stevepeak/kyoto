import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

export default function Mcp(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Text>TODO: Implement mcp logic</Text>
    </Box>
  )
}
