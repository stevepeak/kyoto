import { findGitRoot } from '@app/shell'
import { execa } from 'execa'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { randomBytes } from 'node:crypto'
import React, { useEffect, useState } from 'react'

import { pwdKyoto } from '../helpers/config/find-kyoto-dir'
import { updateConfigJson } from '../helpers/config/update'
import { Footer } from '../ui/footer'
import { Jumbo } from '../ui/jumbo'

// eslint-disable-next-line no-process-env
const APP_URL = process.env.APP_URL || 'http://localhost:3002'
const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

function getOpenCommand(): string {
  const platform = process.platform
  if (platform === 'darwin') {
    return 'open'
  }
  if (platform === 'win32') {
    return 'start'
  }
  return 'xdg-open'
}

type LoginStatus =
  | 'generating-state'
  | 'opening-browser'
  | 'waiting-for-auth'
  | 'success'
  | 'error'
  | 'timeout'

interface LoginProps {
  appUrl?: string
}

export default function Login({
  appUrl = APP_URL,
}: LoginProps): React.ReactElement {
  const { exit } = useApp()
  const [status, setStatus] = useState<LoginStatus>('generating-state')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stateToken, setStateToken] = useState<string | null>(null)

  useEffect(() => {
    const performLogin = async () => {
      try {
        // Generate a random state token
        const state = randomBytes(32).toString('hex')
        setStateToken(state)
        setStatus('opening-browser')

        // Construct the CLI login URL
        const loginUrl = `${appUrl}/cli/login?state=${state}`

        // Open browser
        const command = getOpenCommand()
        await execa(command, [loginUrl])

        setStatus('waiting-for-auth')

        // Poll for authentication
        const startTime = Date.now()
        const pollInterval = setInterval(async () => {
          try {
            // Check if we've timed out
            if (Date.now() - startTime > TIMEOUT_MS) {
              clearInterval(pollInterval)
              setStatus('timeout')
              setErrorMessage('Login timed out. Please try again.')
              void setTimeout(() => {
                exit()
              }, 3000)
              return
            }

            // Poll the API for the session token
            const response = await fetch(
              `${appUrl}/api/cli/session?state=${state}`,
            )

            if (response.ok) {
              const data = (await response.json()) as {
                sessionToken: string
                user: { name: string; login: string }
              }

              clearInterval(pollInterval)

              // Store the session token in config
              const gitRoot = await findGitRoot()
              const { config: configPath } = await pwdKyoto(gitRoot)

              // Read existing config
              const { readFile } = await import('node:fs/promises')
              let existingConfig = {}
              try {
                const content = await readFile(configPath, 'utf-8')
                existingConfig = JSON.parse(content)
              } catch {
                // Config doesn't exist yet
              }

              // Update config with session token
              await updateConfigJson(configPath, null, null, {
                ...existingConfig,
                auth: {
                  sessionToken: data.sessionToken,
                  user: data.user,
                },
              })

              setStatus('success')
              void setTimeout(() => {
                exit()
              }, 2000)
            } else if (response.status === 404) {
              // Still waiting
            } else {
              throw new Error(`Failed to check auth status: ${response.status}`)
            }
          } catch (error) {
            clearInterval(pollInterval)
            setStatus('error')
            setErrorMessage(
              error instanceof Error ? error.message : 'Unknown error occurred',
            )
            void setTimeout(() => {
              exit()
            }, 3000)
          }
        }, POLL_INTERVAL_MS)
      } catch (error) {
        setStatus('error')
        setErrorMessage(
          error instanceof Error ? error.message : 'Unknown error occurred',
        )
        void setTimeout(() => {
          exit()
        }, 3000)
      }
    }

    void performLogin()
  }, [exit, appUrl])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Text> </Text>
      <Box flexDirection="column" marginBottom={1}>
        {status === 'generating-state' && (
          <Box>
            <Text color="blue">
              <Spinner type="dots" />
            </Text>
            <Text> Generating authentication token...</Text>
          </Box>
        )}

        {status === 'opening-browser' && (
          <Box>
            <Text color="blue">
              <Spinner type="dots" />
            </Text>
            <Text> Opening browser for authentication...</Text>
          </Box>
        )}

        {status === 'waiting-for-auth' && (
          <Box flexDirection="column">
            <Box>
              <Text color="blue">
                <Spinner type="dots" />
              </Text>
              <Text> Waiting for authentication...</Text>
            </Box>
            <Text dimColor>
              Complete the GitHub login in your browser to continue
            </Text>
            {stateToken && (
              <Text dimColor>State token: {stateToken.substring(0, 8)}...</Text>
            )}
          </Box>
        )}

        {status === 'success' && (
          <Box flexDirection="column">
            <Text>
              <Text color="green">✓</Text> Successfully authenticated!
            </Text>
            <Text dimColor>You can now use Kyoto CLI</Text>
          </Box>
        )}

        {status === 'timeout' && (
          <Box flexDirection="column">
            <Text color="yellow">⚠ {errorMessage}</Text>
          </Box>
        )}

        {status === 'error' && (
          <Box flexDirection="column">
            <Text color="red">✗ Authentication failed</Text>
            {errorMessage && <Text dimColor>{errorMessage}</Text>}
          </Box>
        )}
      </Box>
      <Footer />
      <Text> </Text>
    </Box>
  )
}
