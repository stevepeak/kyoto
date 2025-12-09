import { Box, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../helpers/display/display-header'

export default function Vibe(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header />
    </Box>
  )
}
