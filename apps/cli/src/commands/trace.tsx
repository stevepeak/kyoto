import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../helpers/display/display-header'

interface TraceProps {
  source?: string
}

export default function Trace({ source }: TraceProps): React.ReactElement {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header message="Trace" />
      <Text>
        TODO: List stories that have evidence pointing to the source lines asked
        to trace.
      </Text>
      {source ? <Text>Source: {source}</Text> : null}
    </Box>
  )
}
