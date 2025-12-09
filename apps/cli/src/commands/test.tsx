import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../helpers/display/display-header'

export default function Test(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header message="Test" />
      <Text>TODO: Implement test logic</Text>
    </Box>
  )
}
