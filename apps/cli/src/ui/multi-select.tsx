import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'

interface Item {
  label: string
  value: string
}

interface MultiSelectProps {
  items: Item[]
  onSubmit?: (selectedItems: Item[]) => void
  defaultSelected?: Item[]
}

export function MultiSelect({
  items,
  onSubmit,
  defaultSelected = [],
}: MultiSelectProps): React.ReactElement {
  const [selectedValues, setSelectedValues] = useState<Set<string>>(
    new Set(defaultSelected.map((item) => item.value)),
  )
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useInput((input, key) => {
    if (key.upArrow) {
      setHighlightedIndex((prev) => Math.max(0, prev - 1))
      return
    }

    if (key.downArrow) {
      setHighlightedIndex((prev) => Math.min(items.length - 1, prev + 1))
      return
    }

    if (input === ' ') {
      const item = items[highlightedIndex]
      if (item) {
        setSelectedValues((prev) => {
          const next = new Set(prev)
          if (next.has(item.value)) {
            next.delete(item.value)
          } else {
            next.add(item.value)
          }
          return next
        })
      }
      return
    }

    if (key.return) {
      const selectedItems = items.filter((item) =>
        selectedValues.has(item.value),
      )
      onSubmit?.(selectedItems)
      return
    }
  })

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = selectedValues.has(item.value)
        const isHighlighted = index === highlightedIndex

        return (
          <Box key={item.value} flexDirection="row" gap={1}>
            <Text>{isHighlighted ? '>' : ' '}</Text>
            <Text>{isSelected ? '[x]' : '[ ]'}</Text>
            <Text color={isHighlighted ? 'cyan' : undefined}>{item.label}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
