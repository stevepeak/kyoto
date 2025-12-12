import { Box, Text, useApp } from 'ink'
import { useEffect } from 'react'

import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'

export default function Setup(): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    // Allow the render to flush before exiting
    setTimeout(() => {
      exit()
    }, 0)
  }, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="設" title="Setup" />
      <Box flexDirection="column" marginTop={1}>
        <Text>Run one of:</Text>
        <Text color="grey">
          - <Text color="yellow">kyoto setup mcp</Text>
        </Text>
        <Text color="grey">
          - <Text color="yellow">kyoto setup github</Text>
        </Text>
      </Box>
    </Box>
  )
}
