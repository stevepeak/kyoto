import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../../helpers/display/display-header'

export default function TestBrowser(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header message="Browser Tests" />
      <Text>TODO: Implement test:browser logic</Text>
    </Box>
  )
}
