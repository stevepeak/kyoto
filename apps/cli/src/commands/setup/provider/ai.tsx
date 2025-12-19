import { Box, useApp } from 'ink'
import React, { useCallback } from 'react'

import { AIProvider } from '.'
import { Header } from '../../../ui/header'
import { Jumbo } from '../../../ui/jumbo'

export default function SetupAi(): React.ReactElement {
  const { exit } = useApp()

  const handleComplete = useCallback(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="設" title="Setup AI" />
      <AIProvider state="active" onComplete={handleComplete} />
    </Box>
  )
}
