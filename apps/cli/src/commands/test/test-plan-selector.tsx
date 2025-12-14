import type { BrowserTestSuggestion } from '@app/agents'
import { Box, Text, useInput, useStdin } from 'ink'
import React from 'react'

import type { TestStatus } from './types'

type TestPlanSelectorProps = {
  tests: BrowserTestSuggestion[]
  testStatuses: Record<string, TestStatus>
  highlightedIndex: number
  customInput: string
  onToggleTest: (testId: string) => void
  onNavigate: (direction: 'up' | 'down') => void
  onCustomInputChange: (value: string) => void
  onSubmit: () => void
}

export function TestPlanSelector({
  tests,
  testStatuses,
  highlightedIndex,
  customInput,
  onToggleTest,
  onNavigate,
  onCustomInputChange,
  onSubmit,
}: TestPlanSelectorProps): React.ReactElement {
  const { isRawModeSupported } = useStdin()
  const isCustomInputHighlighted = highlightedIndex === tests.length

  useInput(
    (input, key) => {
      if (key.upArrow) {
        onNavigate('up')
        return
      }
      if (key.downArrow) {
        onNavigate('down')
        return
      }

      // Space toggles selection
      if (input === ' ' && !isCustomInputHighlighted) {
        const test = tests[highlightedIndex]
        if (test) {
          onToggleTest(test.id)
        }
        return
      }

      // Enter submits
      if (key.return) {
        onSubmit()
        return
      }

      // Typing for custom input
      if (isCustomInputHighlighted) {
        if (key.backspace || key.delete) {
          onCustomInputChange(customInput.slice(0, -1))
        } else if (input && !key.ctrl && !key.meta) {
          onCustomInputChange(customInput + input)
        }
      }
    },
    { isActive: isRawModeSupported ?? false },
  )

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        Test Plan:
      </Text>
      <Box marginTop={1} flexDirection="column">
        {tests.map((test, index) => {
          const isHighlighted = index === highlightedIndex
          const status = testStatuses[test.id] ?? 'pending'
          const isSelected = status === 'selected'

          return (
            <Box key={test.id} gap={1}>
              <Text>{isHighlighted ? '>' : ' '}</Text>
              <Text color={isSelected ? 'green' : 'grey'}>
                {isSelected ? '[x]' : '[ ]'}
              </Text>
              <Text color={isHighlighted ? 'cyan' : undefined}>
                {test.description}
              </Text>
              {test.category && <Text dimColor>({test.category})</Text>}
            </Box>
          )
        })}
        {/* Custom input row */}
        <Box marginTop={1} gap={1}>
          <Text>{isCustomInputHighlighted ? '>' : ' '}</Text>
          <Text color="cyan">→</Text>
          <Text color={isCustomInputHighlighted ? 'cyan' : 'grey'}>
            {customInput ||
              (isCustomInputHighlighted ? '' : 'Custom instructions...')}
          </Text>
          {isCustomInputHighlighted && <Text dimColor>▋</Text>}
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate • Space toggle • Enter run</Text>
      </Box>
    </Box>
  )
}
