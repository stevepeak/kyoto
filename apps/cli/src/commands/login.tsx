import { Box, Text, useApp } from 'ink'
import { useEffect, useState } from 'react'
import { open } from 'ink-link'

import { findGitRoot } from '@app/shell'
import { createState } from '../helpers/auth/state-store'
import { pwdKyoto } from '../helpers/config/find-kyoto-dir'
import { updateConfigJson } from '../helpers/config/update'
import { createLogger } from '../helpers/logging/logger'

const APP_URL = process.env.KYOTO_APP_URL || 'http://localhost:3002'
const POLL_INTERVAL_MS = 1000
const MAX_POLL_TIME_MS = 5 * 60 * 1000 // 5 minutes

async function pollForSessionToken(state: string): Promise<string> {
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    try {
      const response = await fetch(
        `${APP_URL}/api/auth/cli-status?state=${encodeURIComponent(state)}`,
      )

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`)
      }

      const data = (await response.json()) as
        | { status: 'pending' }
        | { status: 'complete'; sessionToken: string }

      if (data.status === 'complete') {
        return data.sessionToken
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    } catch (error) {
      // Continue polling on network errors
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }

  throw new Error('Login timeout. Please try again.')
}

export default function Login(): React.ReactElement {
  const { exit } = useApp()
  const [status, setStatus] = useState<
    'initializing' | 'opening-browser' | 'waiting' | 'success' | 'error'
  >('initializing')
  const [error, setError] = useState<string | null>(null)
  const logger = createLogger()

  useEffect(() => {
    async function performLogin() {
      try {
        // Generate state token
        const state = createState()
        logger.debug(`Generated state token: ${state}`)

        // Get config path
        const gitRoot = await findGitRoot()
        const { config: configPath } = await pwdKyoto(gitRoot)

        // Build OAuth URL through CLI login endpoint
        const oauthUrl = `${APP_URL}/api/auth/cli-login?state=${encodeURIComponent(state)}`

        setStatus('opening-browser')
        logger.info(`Opening browser to: ${oauthUrl}`)

        // Open browser
        await open(oauthUrl)

        setStatus('waiting')
        logger.info('Waiting for authentication...')

        // Poll for session token
        const sessionToken = await pollForSessionToken(state)

        // Store session token in config
        logger.debug('Storing session token in config')
        await updateConfigJson(configPath, null, null, {
          sessionToken,
        })

        setStatus('success')
        logger.info('Login successful!')

        // Exit after a short delay
        setTimeout(() => {
          exit()
        }, 2000)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        setStatus('error')
        logger.error(`Login failed: ${errorMessage}`)

        // Exit after showing error
        setTimeout(() => {
          exit(1)
        }, 3000)
      }
    }

    performLogin()
  }, [exit, logger])

  return (
    <Box flexDirection="column" padding={1}>
      <Text>
        {status === 'initializing' && 'Initializing login...'}
        {status === 'opening-browser' && (
          <>
            <Text color="cyan">Opening browser...</Text>
            <Text> </Text>
            <Text dimColor>
              If the browser doesn't open automatically, please visit the URL
              shown above.
            </Text>
          </>
        )}
        {status === 'waiting' && (
          <>
            <Text color="yellow">Waiting for authentication...</Text>
            <Text> </Text>
            <Text dimColor>
              Complete the GitHub OAuth flow in your browser.
            </Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text color="green">✓ Login successful!</Text>
            <Text> </Text>
            <Text dimColor>Session token saved to config.</Text>
          </>
        )}
        {status === 'error' && (
          <>
            <Text color="red">✗ Login failed</Text>
            <Text> </Text>
            <Text>{error}</Text>
          </>
        )}
      </Text>
    </Box>
  )
}
