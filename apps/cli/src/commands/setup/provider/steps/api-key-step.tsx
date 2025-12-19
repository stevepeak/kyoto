import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import React, { useState } from 'react'

import { type ApiKeyStepProps } from '../types'

export function ApiKeyStep({
  providerLabel,
  onSubmit,
  onError,
}: ApiKeyStepProps): React.ReactElement {
  const [apiKey, setApiKey] = useState('')

  const handleSubmit = (value: string): void => {
    if (!value.trim()) {
      onError('API key is required')
      return
    }
    onSubmit(value.trim())
  }

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="red">
          <Spinner type="dots" />
        </Text>{' '}
        AI Provider
      </Text>
      <Text>
        Enter your <Text color="cyan">{providerLabel}</Text> API key{' '}
        <Text color="grey">(then press &lt;enter&gt; to submit)</Text>:
      </Text>
      <Text color="grey">
        <TextInput
          value={apiKey}
          mask="*"
          onChange={(value) => setApiKey(value)}
          onSubmit={handleSubmit}
        />
      </Text>
    </Box>
  )
}
