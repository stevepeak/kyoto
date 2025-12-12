import { Box, Text } from 'ink'
import { type ReactElement, useMemo } from 'react'

const vibePhrases = [
  'May the vibe be with you.',
  'The way of the vibe.',
  'Be the vibe.',
  'Vibe on.',
]

export function Jumbo(): ReactElement {
  const rows = ['入   |  ', '京   |  ', '行   |  ', '改   |  ', '善   |  ']

  // Select a random phrase once per render
  const selectedPhrase = useMemo(
    () =>
      vibePhrases[Math.floor(Math.random() * vibePhrases.length)] ??
      vibePhrases[0],
    [],
  )

  return (
    <Box flexDirection="column" marginBottom={1}>
      {rows.map((row, index) => (
        <Box key={row} flexDirection="row">
          <Text color="red">{row}</Text>
          {index === 2 ? (
            <>
              <Text bold>Kyoto</Text>
              <Text> </Text>
              <Text color="gray" italic wrap="truncate">
                • {selectedPhrase}
              </Text>
            </>
          ) : null}
        </Box>
      ))}
    </Box>
  )
}
