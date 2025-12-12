import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import React, { useEffect, useState } from 'react'
import { z } from 'zod'

import { openBrowser } from '../helpers/browser/open-browser'
import { updateConfig } from '../helpers/config/update'
import { ensureKyotoInGitignore } from '../helpers/git/ensure-kyoto-in-gitignore'
import { Header } from '../ui/header'
import { Jumbo } from '../ui/jumbo'
import { Link } from '../ui/link'

const cliSessionResponseSchema = z.object({
  token: z.string(),
  userId: z.string(),
  login: z.string(),
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

  let resolveCallback: ((v: { token: string; login: string }) => void) | null =
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
      const login = url.searchParams.get('login') ?? ''

      if (!token) {
        res.statusCode = 400
        res.end('Missing token')
        return
      }

      if (!login) {
        res.statusCode = 400
        res.end('Missing login')
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
          '<html lang="ja">',
          '<head>',
          '<meta charset="utf-8">',
          '<meta name="viewport" content="width=device-width, initial-scale=1">',
          '<title>Kyoto CLI Login</title>',
          '<style>',
          ':root {',
          '  --parchment: #f5f1e8;',
          '  --terracotta: #c97d60;',
          '  --muted-orange: #d4a574;',
          '  --soft-orange: #e8c4a0;',
          '  --text-dark: #5a4a3a;',
          '  --text-muted: #8b7a6b;',
          '}',
          'html, body { height: 100%; margin: 0; }',
          'body {',
          '  font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "YuGothic", "Noto Sans JP", "游ゴシック", "メイリオ", Meiryo, sans-serif;',
          '  background: var(--parchment);',
          '  color: var(--text-dark);',
          '  position: relative;',
          '  overflow: hidden;',
          '  display: grid;',
          '  place-items: center;',
          '  padding: 24px;',
          '}',
          'body::before {',
          '  content: "";',
          '  position: absolute;',
          '  inset: 0;',
          '  background-image:',
          '    radial-gradient(circle at 0.5px 0.5px, rgba(0,0,0,0.03) 0.5px, transparent 0);',
          '  background-size: 8px 8px;',
          '  pointer-events: none;',
          '}',
          '.landscape {',
          '  position: absolute;',
          '  bottom: 0;',
          '  left: 0;',
          '  right: 0;',
          '  height: 40%;',
          '  overflow: hidden;',
          '  z-index: 0;',
          '}',
          '.layer {',
          '  position: absolute;',
          '  bottom: 0;',
          '  left: 0;',
          '  right: 0;',
          '  border-radius: 50% 50% 0 0;',
          '}',
          '.layer-1 {',
          '  height: 100%;',
          '  background: var(--terracotta);',
          '  transform: scaleY(0.6) translateY(20%);',
          '}',
          '.layer-2 {',
          '  height: 85%;',
          '  background: var(--muted-orange);',
          '  transform: scaleY(0.7) translateY(15%);',
          '}',
          '.layer-3 {',
          '  height: 70%;',
          '  background: var(--soft-orange);',
          '  transform: scaleY(0.8) translateY(10%);',
          '}',
          '.pagoda {',
          '  position: absolute;',
          '  right: 15%;',
          '  bottom: 25%;',
          '  width: 40px;',
          '  height: 80px;',
          '  z-index: 1;',
          '}',
          '.pagoda::before, .pagoda::after {',
          '  content: "";',
          '  position: absolute;',
          '  left: 50%;',
          '  transform: translateX(-50%);',
          '  background: var(--muted-orange);',
          '}',
          '.pagoda::before {',
          '  width: 32px;',
          '  height: 8px;',
          '  bottom: 0;',
          '  border-radius: 2px;',
          '  box-shadow: 0 12px 0 var(--muted-orange), 0 24px 0 var(--muted-orange), 0 36px 0 var(--muted-orange);',
          '}',
          '.pagoda::after {',
          '  width: 6px;',
          '  height: 20px;',
          '  top: -20px;',
          '  border-radius: 2px 2px 0 0;',
          '}',
          '.content {',
          '  position: relative;',
          '  z-index: 10;',
          '  text-align: center;',
          '  max-width: 480px;',
          '}',
          '.brand {',
          '  font-size: 32px;',
          '  font-weight: 500;',
          '  letter-spacing: 0.05em;',
          '  color: var(--text-dark);',
          '  margin-bottom: 24px;',
          '}',
          'h1 {',
          '  margin: 0;',
          '  font-size: 28px;',
          '  font-weight: 400;',
          '  line-height: 1.4;',
          '  color: var(--text-dark);',
          '  margin-bottom: 12px;',
          '}',
          '.check {',
          '  display: inline-block;',
          '  width: 32px;',
          '  height: 32px;',
          '  border-radius: 50%;',
          '  background: var(--terracotta);',
          '  color: var(--parchment);',
          '  font-size: 20px;',
          '  line-height: 32px;',
          '  margin-right: 12px;',
          '  vertical-align: middle;',
          '}',
          'p {',
          '  margin: 16px 0 0;',
          '  font-size: 15px;',
          '  line-height: 1.8;',
          '  color: var(--text-muted);',
          '}',
          '.hint {',
          '  margin-top: 20px;',
          '  font-size: 13px;',
          '  color: var(--text-muted);',
          '  opacity: 0.8;',
          '}',
          '</style>',
          '</head>',
          '<body>',
          '<div class="landscape">',
          '  <div class="layer layer-1"></div>',
          '  <div class="layer layer-2"></div>',
          '  <div class="layer layer-3"></div>',
          '  <div class="pagoda" aria-hidden="true"></div>',
          '</div>',
          '<div class="content">',
          '  <div class="brand">Kyoto</div>',
          '  <h1><span class="check" aria-hidden="true">✓</span> 認証完了</h1>',
          '  <p>このウィンドウを閉じて、ターミナルに戻ってください。</p>',
          '  <p class="hint">このウィンドウは <code>1秒</code> 後に自動的に閉じます。</p>',
          '</div>',
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
        const resolvedLogin = session.login ?? result.login ?? 'anonymous'
        await updateConfig({
          ai: {
            apiKey: session.openrouterApiKey,
          },
          user: {
            login: resolvedLogin,
            sessionToken: session.token,
            userId: session.userId,
            openrouterApiKey: session.openrouterApiKey,
          },
        })

        // const analytics = await getCliAnalyticsContext()
        // if (analytics.enabled) {
        //   captureCliEvent({
        //     event: 'cli_login_succeeded',
        //     distinctId: analytics.distinctId,
        //     properties: {},
        //   })
        //   await shutdownCliAnalytics()
        // }

        try {
          await ensureKyotoInGitignore()
        } catch {
          // Silent best-effort
        }

        setLogin(resolvedLogin)
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
      <Header kanji="入京" title="Enter Kyoto" />

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
