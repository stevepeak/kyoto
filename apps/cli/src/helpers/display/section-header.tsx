import { Box, Text } from 'ink'
import React from 'react'

interface SectionHeaderProps {
  kanji: string
  title: string
}

export function SectionHeader({
  kanji,
  title,
}: SectionHeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color="red">{kanji} </Text>
        <Text>{title}</Text>
      </Box>
      <Text color="grey">{'─'.repeat(50)}</Text>
    </Box>
  )
}
