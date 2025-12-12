import { Box, Text } from 'ink'

import { Link } from './link'
import { CLI_VERSION } from '../generated/version'

export function Footer(): JSX.Element {
  return (
    <Box>
      <Text>
        <Text color="red">京</Text>
        <Link url="https://usekyoto.com">
          <Text bold>Kyoto</Text>
        </Link>{' '}
        <Text dimColor>v{CLI_VERSION} </Text>
        <Text color="grey">
          is crafted with intention on{' '}
          <Link url="https://github.com/iopeak/kyoto">GitHub</Link>
        </Text>
      </Text>
    </Box>
  )
}
