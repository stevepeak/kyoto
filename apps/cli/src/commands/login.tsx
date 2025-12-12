import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useState } from 'react'
import { createServer, Server } from 'node:http'
import { randomBytes } from 'node:crypto'
import { URL } from 'node:url'

import { Header } from '../ui/header'
import { createLogger } from '../helpers/logging/logger'
import { handleError } from '../helpers/error-handling/handle-error'
import { storeSession, hasSession } from '../helpers/session-storage'

const WEB_APP_URL = process.env.KYOTO_WEB_URL || 'http://localhost:3002'
const logger = createLogger()

interface LoginState {
  status: 'starting' | 'waiting' | 'success' | 'error'
  message?: string
  port?: number
}

async function startCallbackServer(args: {
  state: string
  onSuccess: (token: string) => void
  onError: (error: Error) => void
}): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400)
        res.end('Bad Request')
        return
      }

      const url = new URL(req.url, `http://localhost`)
      const receivedState = url.searchParams.get('state')
      const token = url.searchParams.get('token')
      const error = url.searchParams.get('error')

      // CORS headers for browser
      res.setHeader('Access-Control-Allow-Origin', WEB_APP_URL)
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Login Failed</title></head>
            <body>
              <h1>Login Failed</h1>
              <p>${error}</p>
              <p>You can close this window and return to your terminal.</p>
            </body>
          </html>
        `)
        args.onError(new Error(error))
        return
      }

      // Validate state to prevent CSRF
      if (receivedState !== args.state) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Invalid State</title></head>
            <body>
              <h1>Security Error</h1>
              <p>Invalid state parameter. Possible CSRF attack detected.</p>
              <p>You can close this window and try again.</p>
            </body>
          </html>
        `)
        args.onError(new Error('Invalid state parameter'))
        return
      }

      if (token) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Login Successful</title></head>
            <body>
              <h1>✓ Login Successful!</h1>
              <p>You have successfully authenticated with GitHub.</p>
              <p>You can close this window and return to your terminal.</p>
            </body>
          </html>
        `)
        args.onSuccess(token)
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Missing Token</title></head>
            <body>
              <h1>Error</h1>
              <p>No token received. Please try again.</p>
              <p>You can close this window and return to your terminal.</p>
            </body>
          </html>
        `)
        args.onError(new Error('No token received'))
      }
    })

    server.on('error', reject)

    // Start on a random available port
    server.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to get server port'))
        return
      }
      resolve({ server, port: address.port })
    })
  })
}

function openBrowser(url: string): void {
  const { exec } = require('node:child_process')
  const command =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open'

  exec(`${command} "${url}"`, (error: Error | null) => {
    if (error) {
      logger.error('Failed to open browser:', error)
    }
  })
}

export default function Login(): React.ReactElement {
  const { exit } = useApp()
  const [loginState, setLoginState] = useState<LoginState>({
    status: 'starting',
  })

  useEffect(() => {
    let server: Server | null = null

    async function performLogin() {
      try {
        // Check if already logged in
        if (hasSession()) {
          setLoginState({
            status: 'success',
            message: 'You are already logged in!',
          })
          await new Promise((resolve) => setTimeout(resolve, 1000))
          exit()
          return
        }

        // Generate a secure state token
        const state = randomBytes(32).toString('hex')

        // Start the callback server
        const { server: callbackServer, port } = await startCallbackServer({
          state,
          onSuccess: (token) => {
            storeSession(token)
            setLoginState({
              status: 'success',
              message: 'Successfully logged in!',
            })
            // Close server and exit after a short delay
            setTimeout(() => {
              callbackServer.close()
              exit()
            }, 1000)
          },
          onError: (error) => {
            setLoginState({
              status: 'error',
              message: error.message,
            })
            setTimeout(() => {
              callbackServer.close()
              exit(1)
            }, 2000)
          },
        })

        server = callbackServer

        setLoginState({
          status: 'waiting',
          message: 'Opening browser for authentication...',
          port,
        })

        // Build the auth URL
        const authUrl = new URL('/cli/auth', WEB_APP_URL)
        authUrl.searchParams.set('state', state)
        authUrl.searchParams.set('port', port.toString())

        // Open browser
        openBrowser(authUrl.toString())

        logger.info('Waiting for authentication...', {
          port,
          authUrl: authUrl.toString(),
        })
      } catch (error) {
        handleError(error, {
          logger,
          setExitCode: () => {},
        })
        setLoginState({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        })
        setTimeout(() => exit(1), 2000)
      }
    }

    performLogin()

    // Cleanup on unmount
    return () => {
      if (server) {
        server.close()
      }
    }
  }, [exit])

  return (
    <Box flexDirection="column">
      <Header kanji="入" title="Login" />
      <Box marginTop={1} flexDirection="column" gap={1}>
        {loginState.status === 'starting' && (
          <Box>
            <Text color="blue">
              <Spinner type="dots" />
            </Text>
            <Text> Initializing login...</Text>
          </Box>
        )}

        {loginState.status === 'waiting' && (
          <Box flexDirection="column" gap={1}>
            <Box>
              <Text color="blue">
                <Spinner type="dots" />
              </Text>
              <Text> {loginState.message}</Text>
            </Box>
            <Text color="gray">
              Waiting for you to complete authentication in your browser...
            </Text>
            {loginState.port && (
              <Text color="gray" dimColor>
                Callback server running on port {loginState.port}
              </Text>
            )}
          </Box>
        )}

        {loginState.status === 'success' && (
          <Box>
            <Text color="green">✓ {loginState.message}</Text>
          </Box>
        )}

        {loginState.status === 'error' && (
          <Box flexDirection="column">
            <Text color="red">✗ Login failed</Text>
            {loginState.message && (
              <Text color="red">{loginState.message}</Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
