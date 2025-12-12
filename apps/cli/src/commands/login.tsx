import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { execa } from 'execa'
import React, { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { findGitRoot } from '@app/shell'

import { pwdKyoto } from '../helpers/config/find-kyoto-dir'
import { updateAuthConfigJson } from '../helpers/config/update-auth'

const startResponseSchema = z.object({
  loginId: z.string().min(1),
  pollToken: z.string().min(1),
  expiresAtMs: z.number().int(),
  loginUrl: z.string().url(),
})

const statusResponseSchema = z.union([
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('expired') }),
  z.object({
    status: z.literal('complete'),
    sessionToken: z.string().min(1),
    user: z.object({
      id: z.string().min(1),
      login: z.string().min(1),
      name: z.string().nullable(),
      email: z.string().nullable(),
      image: z.string().nullable(),
    }),
  }),
])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function openBrowser(url: string): Promise<void> {
  const platform = process.platform

  try {
    if (platform === 'darwin') {
      await execa('open', [url])
      return
    }
    if (platform === 'win32') {
      await execa('cmd', ['/c', 'start', '""', url], { windowsHide: true })
      return
    }
    await execa('xdg-open', [url])
  } catch {
    // Best-effort only.
  }
}

async function startCliLogin(args: { appUrl: string }): Promise<{
  loginId: string
  pollToken: string
  expiresAtMs: number
  loginUrl: string
}> {
  const res = await fetch(new URL('/api/cli/login/start', args.appUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to start login (${res.status}): ${text}`)
  }
  const json = (await res.json()) as unknown
  return startResponseSchema.parse(json)
}

async function pollCliLogin(args: {
  appUrl: string
  loginId: string
  pollToken: string
  expiresAtMs: number
}): Promise<{
  sessionToken: string
  userLogin: string
}> {
  while (Date.now() < args.expiresAtMs) {
    const statusUrl = new URL('/api/cli/login/status', args.appUrl)
    statusUrl.searchParams.set('loginId', args.loginId)

    const res = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${args.pollToken}`,
      },
    })

    if (res.ok) {
      const json = (await res.json()) as unknown
      const parsed = statusResponseSchema.parse(json)

      if (parsed.status === 'complete') {
        return { sessionToken: parsed.sessionToken, userLogin: parsed.user.login }
      }
      if (parsed.status === 'expired') {
        throw new Error('Login expired. Please run `kyoto login` again.')
      }
    }

    await sleep(1000)
  }

  throw new Error('Login timed out. Please run `kyoto login` again.')
}

export default function Login(props: {
  appUrl?: string
}): React.ReactElement {
  const { exit } = useApp()
  const [step, setStep] = useState<
    | { kind: 'starting' }
    | { kind: 'waiting'; loginUrl: string }
    | { kind: 'saving'; userLogin: string }
    | { kind: 'done'; userLogin: string }
    | { kind: 'error'; message: string }
  >({ kind: 'starting' })

  const appUrl = useMemo(() => {
    const raw =
      props.appUrl ??
      // eslint-disable-next-line no-process-env
      process.env.KYOTO_WEB_URL ??
      'http://localhost:3002'
    return raw.replace(/\/+$/, '')
  }, [props.appUrl])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const started = await startCliLogin({ appUrl })
        if (cancelled) return

        setStep({ kind: 'waiting', loginUrl: started.loginUrl })
        await openBrowser(started.loginUrl)

        const { sessionToken, userLogin } = await pollCliLogin({
          appUrl,
          loginId: started.loginId,
          pollToken: started.pollToken,
          expiresAtMs: started.expiresAtMs,
        })
        if (cancelled) return

        setStep({ kind: 'saving', userLogin })

        const gitRoot = await findGitRoot()
        const { config: configPath } = await pwdKyoto(gitRoot)
        await updateAuthConfigJson({
          configPath,
          auth: {
            sessionToken,
            userLogin,
            appUrl,
            createdAt: new Date().toISOString(),
          },
        })

        if (cancelled) return
        setStep({ kind: 'done', userLogin })
        await sleep(500)
        exit()
      } catch (error) {
        if (cancelled) return
        setStep({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [appUrl, exit])

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold>Kyoto Login</Text>
        <Text color="gray">Web: {appUrl}</Text>
      </Box>

      {step.kind === 'starting' && (
        <Text>
          <Spinner type="dots" /> Starting login…
        </Text>
      )}

      {step.kind === 'waiting' && (
        <Box flexDirection="column">
          <Text>
            <Spinner type="dots" /> Waiting for you to finish in the browser…
          </Text>
          <Text>
            Open this URL if a browser didn’t launch automatically:
          </Text>
          <Text color="cyan">{step.loginUrl}</Text>
        </Box>
      )}

      {step.kind === 'saving' && (
        <Text>
          <Spinner type="dots" /> Saving session for @{step.userLogin}…
        </Text>
      )}

      {step.kind === 'done' && <Text>Logged in as @{step.userLogin}.</Text>}

      {step.kind === 'error' && (
        <Box flexDirection="column">
          <Text color="red">Login failed.</Text>
          <Text>{step.message}</Text>
        </Box>
      )}
    </Box>
  )
}

