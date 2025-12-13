import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React from 'react'

import { Jumbo } from './jumbo'

interface CommandLayoutProps {
  loading?: boolean
  progress?: string
  error?: string | null
  children?: React.ReactNode
}

export function CommandLayout({
  loading = false,
  progress,
  error,
  children,
}: CommandLayoutProps): React.ReactElement {
  if (loading) {
    return (
      <Box flexDirection="column">
        <Jumbo />
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          {progress && <Text>{progress}</Text>}
        </Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Jumbo />
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      {children}
    </Box>
  )
}
