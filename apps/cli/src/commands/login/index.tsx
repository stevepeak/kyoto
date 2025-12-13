import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { randomBytes } from 'node:crypto'
import React, { useEffect, useState } from 'react'
import { z } from 'zod'

import { cliSessionResponseSchema, type CliSessionResponse } from '@app/schemas'

import { openBrowser } from '../../helpers/browser/open-browser'
import { updateConfig } from '../../helpers/config/update'
import { ensureKyotoInGitignore } from '../../helpers/git/ensure-kyoto-in-gitignore'
import { startCallbackServer } from '../../helpers/login/create-callback-server'
import { Header } from '../../ui/header'
import { Jumbo } from '../../ui/jumbo'
import { Link } from '../../ui/link'

async function fetchCliSession(args: {
  webUrl: string
  token: string
}): Promise<CliSessionResponse> {
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
