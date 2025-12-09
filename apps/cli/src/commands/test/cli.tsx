import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../../helpers/display/display-header'

export default function TestCli(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header message="CLI Tests" />
      <Text>TODO: Implement test:cli logic</Text>
    </Box>
  )
}
