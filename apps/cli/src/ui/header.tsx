import { Box, Text } from 'ink'

interface HeaderProps {
  kanji: string
  title: string
}

export function Header({ kanji, title }: HeaderProps): React.ReactElement {
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
