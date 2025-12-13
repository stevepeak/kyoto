import { Box, Text } from 'ink'
import React from 'react'

/**
 * Creates a warning React node based on the warning message.
 * Returns null if no warning should be shown.
 */
function createWarningNode(warning: string | null): React.ReactNode | null {
  if (!warning) {
    return null
  }

  // Special case for staged changes with unstaged changes
  if (warning === 'no-staged-with-unstaged') {
    return (
      <Box flexDirection="column" key="no-staged-with-unstaged">
        <Text color="grey">No staged changes found.</Text>
        <Text> </Text>
        <Text color="grey">
          You can vibe check all changes (including unstaged) via:
        </Text>
        <Text color="yellow">kyoto vibe check</Text>
      </Box>
    )
  }

  // Default: simple text warning
  return (
    <Text color="grey" key={warning}>
      {warning}
    </Text>
  )
}

/**
 * Helper to show a warning and exit after a delay.
 * This is an async function that should be awaited.
 */
export async function showWarningAndExit(args: {
  warning: string | null
  setWarnings: (warnings: React.ReactNode[]) => void
  exit: () => void
  cancelled: { current: boolean }
}): Promise<void> {
  const { warning, setWarnings, exit, cancelled } = args

  if (!warning) {
    return
  }

  const warningNode = createWarningNode(warning)
  if (warningNode) {
    setWarnings([warningNode])
  }

  // Wait for warning to be displayed
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined)
    }, 500)
  })

  if (!cancelled.current) {
    exit()
  }
}
