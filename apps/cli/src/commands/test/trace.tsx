import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../../helpers/display/display-header'

export default function TestTrace(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header message="Trace Tests" />
      <Text>TODO: Implement test:trace logic</Text>
    </Box>
  )
}
