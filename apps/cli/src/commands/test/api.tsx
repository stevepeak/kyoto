import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../../helpers/display/display-header'

export default function TestApi(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header message="API Tests" />
      <Text>TODO: Implement test:api logic</Text>
    </Box>
  )
}
