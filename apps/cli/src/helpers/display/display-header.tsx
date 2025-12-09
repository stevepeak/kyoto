import { Box, Text } from 'ink'
import React from 'react'

interface HeaderProps {
  message?: string
}

export function Header({ message = 'Kyoto' }: HeaderProps): React.ReactElement {
  const rows = ['入   |  ', '京   |  ', '行   |  ', '改   |  ', '善   |  ']

  return (
    <Box flexDirection="column" marginBottom={1}>
      {rows.map((row, index) => (
        <Box key={row} flexDirection="row">
          <Text color="red">{row}</Text>
          {index === 2 ? <Text bold>{message}</Text> : null}
        </Box>
      ))}
    </Box>
  )
}
