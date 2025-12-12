import { Box, Text } from 'ink'
import React, { useEffect, useState } from 'react'
import Spinner from 'ink-spinner'

import { Header } from '../ui/header'
import { createAuthenticatedClient } from '../helpers/api-client'
import { createLogger } from '../helpers/logging/logger'

const logger = createLogger()

interface User {
  id: string
  name: string
  email: string
  login?: string
}

type WhoamiState =
  | { status: 'loading' }
  | { status: 'success'; user: User }
  | { status: 'error'; message: string }
  | { status: 'unauthenticated' }

/**
 * Example command that demonstrates using authenticated API calls
 */
export default function Whoami(): React.ReactElement {
  const [state, setState] = useState<WhoamiState>({ status: 'loading' })

  useEffect(() => {
    async function fetchUser() {
      try {
        const client = createAuthenticatedClient()

        if (!client) {
          setState({ status: 'unauthenticated' })
          return
        }

        // Make an authenticated request
        const response = await client.get('/api/cli/session')

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        setState({
          status: 'success',
          user: data.user,
        })
      } catch (error) {
        logger.error('Failed to fetch user:', error)
        setState({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        })
      }
    }

    fetchUser()
  }, [])

  return (
    <Box flexDirection="column">
      <Header kanji="私" title="Who Am I?" />
      <Box marginTop={1} flexDirection="column" gap={1}>
        {state.status === 'loading' && (
          <Box>
            <Text color="blue">
              <Spinner type="dots" />
            </Text>
            <Text> Fetching user information...</Text>
          </Box>
        )}

        {state.status === 'unauthenticated' && (
          <Box flexDirection="column">
            <Text color="yellow">⚠ Not authenticated</Text>
            <Text color="gray">
              Please run <Text bold>kyoto login</Text> to authenticate
            </Text>
          </Box>
        )}

        {state.status === 'success' && (
          <Box flexDirection="column" gap={1}>
            <Text color="green">✓ Authenticated</Text>
            <Box>
              <Text bold>Name: </Text>
              <Text>{state.user.name}</Text>
            </Box>
            <Box>
              <Text bold>Email: </Text>
              <Text>{state.user.email}</Text>
            </Box>
            {state.user.login && (
              <Box>
                <Text bold>GitHub: </Text>
                <Text>@{state.user.login}</Text>
              </Box>
            )}
            <Box>
              <Text bold>User ID: </Text>
              <Text color="gray">{state.user.id}</Text>
            </Box>
          </Box>
        )}

        {state.status === 'error' && (
          <Box flexDirection="column">
            <Text color="red">✗ Error</Text>
            <Text color="red">{state.message}</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
