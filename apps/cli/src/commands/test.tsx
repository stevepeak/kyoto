import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../helpers/display/display-header'
import { useCliLogger } from '../helpers/logging/logger'

export default function Test(): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()

  useEffect(() => {
    logger('Starting test command (placeholder)')
    logger('TODO: Implement test logic')
    exit()
  }, [exit, logger])

  return (
    <Box flexDirection="column">
      <Header message="Test" />
      <Text>TODO: Implement test logic</Text>
      {logs.map((line) => (
        <React.Fragment key={line.key}>{line.content}</React.Fragment>
      ))}
    </Box>
  )
}
