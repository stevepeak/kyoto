import { Box, Text, useApp } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../../helpers/display/display-header'
import { useCliLogger } from '../../helpers/logging/logger'

export default function TestReview(): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()

  useEffect(() => {
    logger('Starting review tests (placeholder)')
    logger('TODO: Implement test:review logic')
    exit()
  }, [exit, logger])

  return (
    <Box flexDirection="column">
      <Header message="Review Tests" />
      <Text>TODO: Implement test:review logic</Text>
      {logs.map((line) => (
        <React.Fragment key={line.key}>{line.content}</React.Fragment>
      ))}
    </Box>
  )
}
