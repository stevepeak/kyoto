import { Box, Text } from 'ink'
import React from 'react'

export function Header(): React.ReactElement {
  const rows = ['入   |  ', '京   |  ', '行   |  ', '改   |  ', '善   |  ']

  return (
    <Box flexDirection="column" marginBottom={1}>
      {rows.map((row, index) => (
        <Box key={row} flexDirection="row">
          <Text color="red">{row}</Text>
          {index === 2 ? (
            <>
              <Text bold>Kyoto</Text>
              <Text> </Text>
              <Text color="gray" italic>
                • May the vibe be with you.
              </Text>
            </>
          ) : null}
        </Box>
      ))}
    </Box>
  )
}
