import { Box, Text } from 'ink'
import React from 'react'

import { Link } from '../../../ui/link'

interface ExistsResultProps {
  apiKey: string | null
  secretsUrl: string | null
}

export function ExistsResult({
  apiKey,
  secretsUrl,
}: ExistsResultProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="green">✓</Text> GitHub Actions workflow already exists at{' '}
        <Text color="cyan">.github/workflows/kyoto.yml</Text>
      </Text>
      {apiKey ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="grey">
            Don't forget to add <Text color="cyan">KYOTO_TOKEN</Text> set to{' '}
            <Text color="yellow">{apiKey}</Text> on your GitHub repository
            Actions secrets.{' '}
            {secretsUrl && (
              <Text color="cyan">
                <Link url={secretsUrl}>{secretsUrl}</Link>
              </Text>
            )}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}
