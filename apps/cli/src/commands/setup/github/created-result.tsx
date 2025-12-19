import { Box, Text } from 'ink'
import React from 'react'

import { Link } from '../../../ui/link'

interface CreatedResultProps {
  apiKey: string | null
  secretsUrl: string | null
  isFileTracked: boolean
}

export function CreatedResult({
  apiKey,
  secretsUrl,
  isFileTracked,
}: CreatedResultProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {/* 1. Wrote file */}
      <Text>
        <Text color="green">✓</Text> Wrote{' '}
        <Text color="cyan">.github/workflows/kyoto.yml</Text>
      </Text>

      {/* 2. Steps to add token */}
      {apiKey ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="grey">
            To complete setup, add the following secret to your GitHub
            repository:
          </Text>
          {secretsUrl && (
            <Box flexDirection="column" marginTop={1}>
              <Box flexDirection="row">
                <Box width={12}>
                  <Text color="grey">1. Go to:</Text>
                </Box>
                <Text color="cyan">
                  <Link url={secretsUrl}>{secretsUrl}</Link>
                </Text>
              </Box>
              <Box flexDirection="row">
                <Box width={12}>
                  <Text color="grey">2. Name:</Text>
                </Box>
                <Text color="cyan">KYOTO_TOKEN</Text>
              </Box>
              <Box flexDirection="row">
                <Box width={12}>
                  <Text color="grey">3. Secret:</Text>
                </Box>
                <Text color="yellow">{apiKey}</Text>
              </Box>
              <Box flexDirection="row">
                <Box width={12}>
                  <Text color="grey">4. Click:</Text>
                </Box>
                <Text color="white">Add secret</Text>
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color="grey">
            ⚠️ Could not read API key from config. You'll need to manually add
            the <Text color="cyan">KYOTO_TOKEN</Text> secret to your GitHub
            repository.
          </Text>
        </Box>
      )}

      {/* 3. Next commit changes */}
      {!isFileTracked ? (
        <>
          <Box marginTop={1}>
            <Text color="grey">Next:</Text>
          </Box>
          <Text>
            <Text dimColor>$ </Text>
            <Text color="yellow">
              kyoto commit &quot;kyoto github workflow&quot;
            </Text>
          </Text>
        </>
      ) : null}
    </Box>
  )
}
