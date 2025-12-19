import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React from 'react'

type SetupPhase = 'checking' | 'setting-up'

interface LoadingStepProps {
  phase: SetupPhase
}

export function LoadingStep({ phase }: LoadingStepProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="red">
          <Spinner type="dots" />
        </Text>{' '}
        Setup GitHub Actions workflow
      </Text>
      <Text color="grey">
        {phase === 'setting-up'
          ? 'Creating .github/workflows/kyoto.yml...'
          : 'Checking for existing workflow...'}
      </Text>
    </Box>
  )
}
