import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../helpers/display/display-header'

export default function Mcp(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header message="MCP" />
      <Text>TODO: Implement mcp logic</Text>
    </Box>
  )
}
