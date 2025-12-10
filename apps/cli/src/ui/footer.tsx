import { Box, Text } from 'ink'
import Link from 'ink-link'
import React from 'react'

export function Footer(): React.ReactElement {
  return (
    <Box>
      <Text>
        <Text color="red">京</Text>
        {/* @ts-expect-error: Link type error intentionally ignored */}
        <Link url="https://usekyoto.com">
          <Text bold>Kyoto</Text>
        </Link>{' '}
        <Text color="grey">
          is crafted with intention on{' '}
          {/* @ts-expect-error: Link type error intentionally ignored */}
          <Link url="https://github.com/iopeak/kyoto">GitHub</Link>
        </Text>
      </Text>
    </Box>
  )
}
