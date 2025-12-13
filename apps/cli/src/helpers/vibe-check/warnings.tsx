import { Box, Text } from 'ink'
import React from 'react'

interface WarningContext {
  commandName?: string
  alternativeCommand?: string
}

/**
 * Creates a warning React node based on the warning message.
 * Returns null if no warning should be shown.
 */
function createWarningNode(
  warning: string | null,
  context?: WarningContext,
): React.ReactNode | null {
  if (!warning) {
    return null
  }

  // Special case for staged changes with unstaged changes
  if (warning === 'no-staged-with-unstaged') {
    const alternativeCommand = context?.alternativeCommand ?? 'kyoto vibe check'
    return (
      <Box flexDirection="column" key="no-staged-with-unstaged">
        <Text color="grey">No staged changes found.</Text>
        <Text> </Text>
        <Text color="grey">
          You can check all changes (including unstaged) via:
        </Text>
        <Text color="yellow">{alternativeCommand}</Text>
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
  commandName?: string
  alternativeCommand?: string
}): Promise<void> {
  const {
    warning,
    setWarnings,
    exit,
    cancelled,
    commandName,
    alternativeCommand,
  } = args

  if (!warning) {
    return
  }

  const warningNode = createWarningNode(warning, {
    commandName,
    alternativeCommand,
  })
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
