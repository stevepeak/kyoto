import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import React from 'react'

import { type Provider, PROVIDER_ITEMS } from '../constants'
import { type SelectProviderStepProps } from '../types'

export function SelectProviderStep({
  onSelect,
}: SelectProviderStepProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="red">
          <Spinner type="dots" />
        </Text>{' '}
        AI Provider
      </Text>
      <Text color="grey">Select your AI provider:</Text>
      <Box>
        <SelectInput
          items={PROVIDER_ITEMS}
          onSelect={(item) => {
            onSelect(item.value as Provider)
          }}
        />
      </Box>
    </Box>
  )
}
