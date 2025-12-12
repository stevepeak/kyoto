import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import React, { useEffect, useState } from 'react'
import { z } from 'zod'

import { getCliAnalyticsContext } from '../helpers/analytics/cli-analytics'
import {
  captureCliEvent,
  shutdownCliAnalytics,
} from '../helpers/analytics/posthog'
import { openBrowser } from '../helpers/browser/open-browser'
import { updateConfig } from '../helpers/config/update'
import { ensureKyotoInGitignore } from '../helpers/git/ensure-kyoto-in-gitignore'
import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'
import { Link } from '../ui/link'

const cliSessionResponseSchema = z.object({
  token: z.string(),
  userId: z.string(),
  login: z.string().optional(),
  openrouterApiKey: z.string(),
  createdAtMs: z.number(),
})

async function fetchCliSession(args: {
  webUrl: string
  token: string
}): Promise<z.infer<typeof cliSessionResponseSchema>> {
  const url = new URL('/api/cli/session', args.webUrl)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      authorization: `Bearer ${args.token}`,
    },
  })

  const json: unknown = await res.json()
  if (!res.ok) {
    const err = z.object({ error: z.string() }).safeParse(json)
    throw new Error(
      err.success ? err.data.error : 'Failed to fetch CLI session',
    )
  }

  return cliSessionResponseSchema.parse(json)
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
          '<body style="font-family: ui-sans-serif, system-ui; padding: 24px; text-align: center;">',
          '<h1 style="color: #22c55e;">✓ Login complete</h1>',
          '<p style="font-size: 16px; margin-top: 24px;">You can close this window and return to your terminal.</p>',
          '<script>',
          'setTimeout(function() {',
          '  try { window.close(); } catch(e) {}',
          '}, 1000);',
          '</script>',
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

export default function Login(): React.ReactElement {
  const { exit } = useApp()
  // eslint-disable-next-line no-process-env
  const webUrl = process.env.APP_URL ?? 'https://usekyoto.com'
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
        const session = await fetchCliSession({ webUrl, token: result.token })
        await updateConfig({
          ai: {
            apiKey: session.openrouterApiKey,
          },
          user: {
            sessionToken: session.token,
            userId: session.userId,
            openrouterApiKey: session.openrouterApiKey,
          },
        })

        const analytics = await getCliAnalyticsContext()
        if (analytics.enabled) {
          captureCliEvent({
            event: 'cli_login_succeeded',
            distinctId: analytics.distinctId,
            properties: {},
          })
          await shutdownCliAnalytics()
        }

        try {
          await ensureKyotoInGitignore()
        } catch {
          // Silent best-effort
        }

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
        {status === 'starting' ? <Text>Starting local callback…</Text> : null}
        {status === 'opened' ? (
          <Text>Opening browser for GitHub login…</Text>
        ) : null}
        {status === 'waiting' && loginUrl ? (
          <Box flexDirection="column">
            <Text color="grey">
              If your browser didn't open automatically,
              <Text> </Text>
              <Link url={loginUrl}>
                <Text italic underline>
                  click here
                </Text>
              </Link>
            </Text>
            <Text>
              <Text color="red">
                <Spinner type="dots" />
              </Text>{' '}
              Waiting for login via{' '}
              <Link url={loginUrl}>
                <Text italic underline>
                  https://usekyoto.com
                </Text>
              </Link>
              …
            </Text>
          </Box>
        ) : null}
        {status === 'saving' ? <Text>Saving session token…</Text> : null}

        {status === 'done' ? (
          <Text>
            <Text color="green">✓</Text> Logged in as{' '}
            <Text bold>{login ? `@${login}` : 'anonymous'}</Text>
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
