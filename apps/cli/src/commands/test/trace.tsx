import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../../helpers/display/display-header'
import { useCliLogger } from '../../helpers/logging/logger'

export default function TestTrace(): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()

  useEffect(() => {
    logger('Starting trace tests (placeholder)')
    logger('TODO: Implement test:trace logic')
    exit()
  }, [exit, logger])

  return (
    <Box flexDirection="column">
      <Header message="Trace Tests" />
      <Text>TODO: Implement test:trace logic</Text>
      {logs.map((line) => (
        <React.Fragment key={line.key}>{line.content}</React.Fragment>
      ))}
    </Box>
  )
}
