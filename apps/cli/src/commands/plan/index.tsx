import { Box, Text, useApp } from 'ink'
import React from 'react'

import { Jumbo } from '../../ui/jumbo'
import { MultiSelect } from '../../ui/multi-select'

interface Finding {
  label: string
  value: string
}

const findings: Finding[] = [
  {
    label: 'Replace hardcoded API endpoints with environment variables',
    value: 'env-api-endpoints',
  },
  {
    label: 'Add input validation using Zod schemas',
    value: 'zod-validation',
  },
  {
    label: 'Extract magic numbers into named constants',
    value: 'magic-numbers',
  },
  {
    label: 'Replace any types with proper TypeScript types',
    value: 'any-types',
  },
  {
    label: 'Add error handling for async operations',
    value: 'async-error-handling',
  },
  {
    label: 'Use named function arguments instead of positional',
    value: 'named-args',
  },
  {
    label: 'Split large components into smaller, reusable ones',
    value: 'component-splitting',
  },
  {
    label: 'Replace inline styles with Tailwind utility classes',
    value: 'tailwind-styles',
  },
  {
    label: 'Add proper TypeScript return types to functions',
    value: 'return-types',
  },
  {
    label: 'Use shadcn semantic colors instead of hardcoded colors',
    value: 'semantic-colors',
  },
]

export default function Plan(): React.ReactElement {
  const { exit } = useApp()

  const handleSubmit = (_selectedItems: Finding[]): void => {
    // User can toggle findings on/off
    // The component handles the selection state internally
    setTimeout(() => {
      exit()
    }, 100)
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Box marginTop={1} flexDirection="column">
        <Text bold>Code Improvement Findings</Text>
        <Text color="gray">
          Use arrow keys to navigate, space to toggle, Enter to submit
        </Text>
      </Box>
      <Box marginTop={1}>
        <MultiSelect items={findings} onSubmit={handleSubmit} />
      </Box>
    </Box>
  )
}
