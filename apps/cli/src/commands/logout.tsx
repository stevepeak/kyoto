import { Box, Text } from 'ink'
import React, { useEffect } from 'react'

import { Header } from '../ui/header'
import { clearSession, hasSession } from '../helpers/session-storage'

export default function Logout(): React.ReactElement {
  useEffect(() => {
    if (hasSession()) {
      clearSession()
    }
  }, [])

  return (
    <Box flexDirection="column">
      <Header kanji="出" title="Logout" />
      <Box marginTop={1}>
        {hasSession() ? (
          <Text color="yellow">⚠ Failed to clear session</Text>
        ) : (
          <Text color="green">✓ Successfully logged out</Text>
        )}
      </Box>
    </Box>
  )
}
