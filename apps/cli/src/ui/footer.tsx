import { Box, Text } from 'ink'
import React from 'react'

import { Link } from './link'

export function Footer(): React.ReactElement {
  return (
    <Box>
      <Text>
        <Text color="red">京</Text>
        <Link url="https://usekyoto.com">
          <Text bold>Kyoto</Text>
        </Link>{' '}
        <Text color="grey">
          is crafted with intention on{' '}
          <Link url="https://github.com/iopeak/kyoto">GitHub</Link>
        </Text>
      </Text>
    </Box>
  )
}
