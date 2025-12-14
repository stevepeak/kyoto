import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import React, { useEffect, useState } from 'react'

import { type ConfirmChangeStepProps } from '../types'

export function ConfirmChangeStep({
  existingConfig,
  existingProviderLabel,
  onConfirmChange,
  onKeepExisting,
  onError,
}: ConfirmChangeStepProps): React.ReactElement {
  const [inputValue, setInputValue] = useState('')
  const [isInputReady, setIsInputReady] = useState(false)

  // Mark input as ready after a small delay to ensure it's rendered
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInputReady(true)
    }, 100)
    return () => {
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = (value: string): void => {
    // Only process submission if input is ready (prevents auto-submission on mount)
    if (!isInputReady) {
      return
    }

    const normalized = value.trim().toLowerCase()
    if (normalized === 'y' || normalized === 'yes') {
      onConfirmChange()
    } else if (normalized === '' || normalized === 'n' || normalized === 'no') {
      onKeepExisting()
    } else {
      onError('Please enter "y" for yes or "n" for no (or press Enter for no)')
    }
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
        <Text color="grey">- </Text>
        <Text color="cyan"> {existingConfig.ai.model}</Text>
        <Text color="grey"> via </Text>
        <Text color="yellow">{existingProviderLabel}</Text>
      </Text>
      <Box flexDirection="row" gap={1} alignItems="center">
        <Text>
          Choose a different provider? <Text color="grey">(N/y)</Text>
        </Text>
        <TextInput
          key="confirm-provider-input"
          value={inputValue}
          onChange={setInputValue}
          focus={true}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  )
}
