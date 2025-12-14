import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import React from 'react'

interface ConfirmationInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  error?: string | null
}

export function ConfirmationInput({
  value,
  onChange,
  onSubmit,
  error,
}: ConfirmationInputProps): React.ReactElement {
  return (
    <>
      <Box marginTop={2} flexDirection="row" gap={1} alignItems="center">
        <Text>
          Commit this plan? <Text color="grey">(Y/n)</Text>
        </Text>
        <TextInput
          value={value}
          onChange={onChange}
          focus={true}
          onSubmit={onSubmit}
        />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </>
  )
}
