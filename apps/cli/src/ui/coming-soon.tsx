import { Box, Text, useApp } from 'ink'
import { type ReactElement, useEffect } from 'react'

import { Jumbo } from './jumbo'

export function ComingSoon(): ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    setTimeout(() => {
      exit()
    }, 0)
  }, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Text> </Text>
      <Text color="yellow">⚠️ This command is coming soon.</Text>
      <Text> </Text>
      <Text>
        To enable experimental features, add{' '}
        <Text color="yellow">"experimental": true</Text> to your{' '}
        <Text color="yellow">.kyoto/config.json</Text> file.
      </Text>
      <Text> </Text>
    </Box>
  )
}
