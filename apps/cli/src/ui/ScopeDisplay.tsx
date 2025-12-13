import { Box, Text } from 'ink'
import { type ReactElement } from 'react'

interface ScopeDisplayProps {
  scopeDescription: string | null
}

export function ScopeDisplay({
  scopeDescription,
}: ScopeDisplayProps): ReactElement | null {
  if (!scopeDescription) {
    return null
  }

  return (
    <Box marginBottom={1}>
      <Text color="grey">Scope: {scopeDescription}</Text>
    </Box>
  )
}
