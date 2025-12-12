import { Box, useApp } from 'ink'
import React, { useCallback } from 'react'

import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'
import { MCP } from './init/mcp'

export default function SetupMcp(): React.ReactElement {
  const { exit } = useApp()

  const handleComplete = useCallback(() => {
    setTimeout(() => exit(), 250)
  }, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="設" title="Setup MCP" />
      <MCP state="active" onComplete={handleComplete} />
    </Box>
  )
}
