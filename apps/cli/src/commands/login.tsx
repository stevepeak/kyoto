import { Box, Text, useApp } from 'ink'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import React, { useEffect, useMemo, useState } from 'react'

import { writeCliAuthSession } from '../helpers/auth/session-store'
import { openBrowser } from '../helpers/browser/open-browser'
import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'

function getWebUrl(explicit?: string): string {
  if (explicit) return explicit.replace(/\/+$/, '')
  // eslint-disable-next-line no-process-env
  const env = process.env.KYOTO_WEB_URL
  if (env) return env.replace(/\/+$/, '')
  return 'http://localhost:3002'
}

function generateState(): string {
  return randomBytes(16).toString('base64url')
}

async function startCallbackServer(args: { expectedState: string }): Promise<{
  redirectUri: string
  waitForCallback: Promise<{ token: string; login?: string }>
  close: () => void
}> {
  const { expectedState } = args

  let resolveCallback: ((v: { token: string; login?: string }) => void) | null =
    null
  let rejectCallback: ((e: unknown) => void) | null = null

  const waitForCallback = new Promise<{ token: string; login?: string }>(
    (resolve, reject) => {
      resolveCallback = resolve
      rejectCallback = reject
    },
  )

  const server = createServer((req, res) => {
    try {
      const host = req.headers.host ?? '127.0.0.1'
      const url = new URL(req.url ?? '/', `http://${host}`)
      if (url.pathname !== '/callback') {
        res.statusCode = 404
        res.end('Not found')
        return
      }

      const state = url.searchParams.get('state') ?? ''
      const token = url.searchParams.get('token') ?? ''
      const login = url.searchParams.get('login') ?? undefined

      if (!token) {
        res.statusCode = 400
        res.end('Missing token')
        return
      }

      if (state !== expectedState) {
        res.statusCode = 400
        res.end('Invalid state')
        return
      }

      res.statusCode = 200
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(
        [
          '<!doctype html>',
          '<html>',
          '<head><meta charset="utf-8"><title>Kyoto CLI Login</title></head>',
          '<body style="font-family: ui-sans-serif, system-ui; padding: 24px;">',
          '<h1>Login complete</h1>',
          '<p>You can close this window and return to your terminal.</p>',
          '</body>',
          '</html>',
        ].join(''),
      )

      server.close(() => resolveCallback?.({ token, login }))
    } catch (e) {
      try {
        res.statusCode = 500
        res.end('Internal error')
      } finally {
        server.close(() => rejectCallback?.(e))
      }
    }
  })

  const redirectUri = await new Promise<string>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close(() =>
          reject(new Error('Failed to bind local callback port')),
        )
        return
      }
      resolve(`http://127.0.0.1:${address.port}/callback`)
    })
  })

  const timeout = setTimeout(
    () => {
      server.close(() =>
        rejectCallback?.(new Error('Timed out waiting for login callback')),
      )
    },
    2 * 60 * 1000,
  )

  server.on('close', () => {
    clearTimeout(timeout)
  })

  return {
    redirectUri,
    waitForCallback,
    close: () => {
      server.close()
    },
  }
}

export default function Login(props: { webUrl?: string }): React.ReactElement {
  const { exit } = useApp()
  const webUrl = useMemo(() => getWebUrl(props.webUrl), [props.webUrl])
  const [status, setStatus] = useState<
    'idle' | 'starting' | 'opened' | 'waiting' | 'saving' | 'done' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)
  const [login, setLogin] = useState<string | null>(null)
  const [loginUrl, setLoginUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let closeServer: (() => void) | null = null

    void (async () => {
      try {
        setStatus('starting')
        const state = generateState()

        const callbackServer = await startCallbackServer({
          expectedState: state,
        })
        closeServer = callbackServer.close

        const url = new URL('/cli/login', webUrl)
        url.searchParams.set('state', state)
        url.searchParams.set('redirect_uri', callbackServer.redirectUri)
        setLoginUrl(url.toString())

        setStatus('opened')
        try {
          await openBrowser({ url: url.toString() })
        } catch {
          // If browser open fails, still show the URL for manual copy/paste.
        }

        setStatus('waiting')
        const result = await callbackServer.waitForCallback
        if (cancelled) return

        setStatus('saving')
        await writeCliAuthSession({
          webUrl,
          token: result.token,
          login: result.login,
          createdAtMs: Date.now(),
        })

        setLogin(result.login ?? null)
        setStatus('done')
        setTimeout(() => exit(), 250)
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setError(e instanceof Error ? e.message : 'Login failed')
      }
    })()

    return () => {
      cancelled = true
      closeServer?.()
    }
  }, [exit, webUrl])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="認証" title="Login" />

      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text bold>Web:</Text> {webUrl}
        </Text>

        {loginUrl ? (
          <Text>
            If your browser didn’t open automatically, open:
            <Text> </Text>
            <Text underline>{loginUrl}</Text>
          </Text>
        ) : null}

        {status === 'starting' ? <Text>Starting local callback…</Text> : null}
        {status === 'opened' ? (
          <Text>Opening browser for GitHub login…</Text>
        ) : null}
        {status === 'waiting' ? (
          <Text>Waiting for browser callback…</Text>
        ) : null}
        {status === 'saving' ? <Text>Saving session token…</Text> : null}

        {status === 'done' ? (
          <Text>
            Logged in{login ? ` as @${login}` : ''}. Token saved to{' '}
            <Text bold>.kyoto/auth.json</Text>.
          </Text>
        ) : null}

        {status === 'error' ? (
          <Box flexDirection="column">
            <Text color="red">Login failed: {error}</Text>
            {loginUrl ? (
              <Text>
                Web login page: <Text underline>{loginUrl}</Text>
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
