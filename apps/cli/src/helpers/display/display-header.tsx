import { Box, Text } from 'ink'
import React from 'react'

interface HeaderProps {
  message?: React.ReactNode
}

const defaultMessage = <Text bold>Kyoto</Text>

export function Header({
  message = defaultMessage,
}: HeaderProps): React.ReactElement {
  const rows = ['入   |  ', '京   |  ', '行   |  ', '改   |  ', '善   |  ']

  return (
    <Box flexDirection="column" marginBottom={1}>
      {rows.map((row, index) => (
        <Box key={row} flexDirection="row">
          <Text color="red">{row}</Text>
          {index === 2 ? message : null}
        </Box>
      ))}
    </Box>
  )
}
