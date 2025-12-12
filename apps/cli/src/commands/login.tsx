import { findGitRoot } from '@app/shell'
import { execa } from 'execa'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import React, { useEffect, useState } from 'react'

import { pwdKyoto } from '../helpers/config/find-kyoto-dir'
import { updateConfigJson } from '../helpers/config/update'

export default function Login() {
  const { exit } = useApp()
  const [status, setStatus] = useState<'initializing' | 'waiting' | 'success' | 'error'>('initializing')
  const [error, setError] = useState<string>('')
  const [authUrl, setAuthUrl] = useState<string>('')

  useEffect(() => {
    let server: any

    const startLogin = async () => {
      try {
        const state = randomUUID()

        server = createServer(async (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

          if (req.method === 'OPTIONS') {
            res.writeHead(200)
            res.end()
            return
          }

          const url = new URL(req.url || '', `http://localhost`)
          
          if (url.pathname === '/callback') {
            const token = url.searchParams.get('token')
            const receivedState = url.searchParams.get('state')

            if (receivedState !== state) {
              res.writeHead(400)
              res.end('Invalid state')
              setError('Invalid state received')
              setStatus('error')
              server.close()
              exit()
              return
            }

            if (token) {
              try {
                const gitRoot = await findGitRoot()
                const { config: configPath } = await pwdKyoto(gitRoot)
                await updateConfigJson(configPath, null, null, { auth: { token } })
                
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(`
                  <html>
                    <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                      <div style="text-align: center;">
                        <h1 style="color: #22c55e;">Login successful!</h1>
                        <p>You can close this tab and return to the terminal.</p>
                      </div>
                      <script>setTimeout(() => window.close(), 2000)</script>
                    </body>
                  </html>
                `)
                
                setStatus('success')
                setTimeout(() => {
                    server.close()
                    exit()
                }, 1000)
              } catch (e) {
                res.writeHead(500)
                res.end('Error saving token')
                setError('Failed to save token')
                setStatus('error')
                server.close()
                exit()
              }
            } else {
              res.writeHead(400)
              res.end('No token provided')
              setError('No token received')
              setStatus('error')
              server.close()
              exit()
            }
          } else {
              res.writeHead(404)
              res.end('Not found')
          }
        })

        server.listen(0, async () => {
            const address = server.address()
            const port = typeof address === 'object' && address ? address.port : 0
            
            // Default to localhost:3002 for web app
            const webUrl = process.env.WEB_URL || 'http://localhost:3002'
            const url = `${webUrl}/auth/cli?state=${state}&port=${port}`
            
            setAuthUrl(url)
            setStatus('waiting')
            
            try {
                if (process.platform === 'darwin') {
                    await execa('open', [url])
                } else if (process.platform === 'linux') {
                    await execa('xdg-open', [url])
                } else if (process.platform === 'win32') {
                    await execa('cmd', ['/c', 'start', url])
                }
            } catch (e) {
                // If opening fails, user will see the URL
            }
        })

      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        setStatus('error')
        if (server) server.close()
        exit()
      }
    }

    startLogin()
    
    // Cleanup
    return () => {
        if (server) server.close()
    }
  }, [exit])

  if (status === 'initializing') {
    return <Text><Spinner type="dots" /> Initializing login flow...</Text>
  }

  if (status === 'waiting') {
    return (
      <Box flexDirection="column">
        <Text><Spinner type="dots" /> Waiting for browser login...</Text>
        <Text>If the browser didn't open, please visit:</Text>
        <Text color="blue">{authUrl}</Text>
      </Box>
    )
  }

  if (status === 'success') {
    return <Text color="green">✔ Login successful!</Text>
  }

  if (status === 'error') {
    return <Text color="red">✘ Error: {error}</Text>
  }

  return null
}
