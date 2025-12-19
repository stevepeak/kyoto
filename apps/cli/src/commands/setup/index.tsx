import { Box, Text } from 'ink'

import { useExitAfterRender } from '../../helpers/ink/exit-wrap'
import { Header } from '../../ui/header'
import { Jumbo } from '../../ui/jumbo'

export default function Setup(): React.ReactElement {
  useExitAfterRender()

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="設" title="Setup" />
      <Box flexDirection="column" marginTop={1}>
        <Text>Run one of:</Text>
        <Text color="grey">
          - <Text color="yellow">kyoto setup mcp</Text>
        </Text>
        <Text color="grey">
          - <Text color="yellow">kyoto setup github</Text>
        </Text>
      </Box>
    </Box>
  )
}
