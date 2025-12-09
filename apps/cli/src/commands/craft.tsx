import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../helpers/display/display-header'

export default function Craft(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header message="Craft with intention." />
      <Text>TODO: Implement craft logic</Text>
    </Box>
  )
}
