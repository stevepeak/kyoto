import { Box, Text } from 'ink'
import React from 'react'

interface HeaderProps {
  message?: React.ReactNode
}

export function Header({ message }: HeaderProps): React.ReactElement {
  const rows = ['入   |  ', '京   |  ', '行   |  ', '改   |  ', '善   |  ']
  const hasMessage = message !== undefined && message !== null && message !== ''

  return (
    <Box flexDirection="column" marginBottom={1}>
      {rows.map((row, index) => (
        <Box key={row} flexDirection="row">
          <Text color="red">{row}</Text>
          {hasMessage && index === 1 ? <Text bold>Kyoto</Text> : null}
          {!hasMessage && index === 2 ? (
            <>
              <Text bold>Kyoto</Text>
              <Text> </Text>
              <Text color="gray" italic>
                • May the vibe be with you.
              </Text>
            </>
          ) : null}
          {hasMessage && index === 3 ? (
            <Text italic color="grey">
              {message}
            </Text>
          ) : null}
        </Box>
      ))}
    </Box>
  )
}
