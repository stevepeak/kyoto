'use client'

import { useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/auth-client'

type State =
  | { kind: 'waiting_for_session' }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

export default function CliLoginCompletePage(): React.ReactElement {
  const searchParams = useSearchParams()
  const { data: session, isPending } = useSession()
  const [state, setState] = useState<State>({ kind: 'waiting_for_session' })

  const [loginId, setLoginId] = useState(searchParams.get('loginId') ?? '')
  const [browserToken, setBrowserToken] = useState(
    searchParams.get('browserToken') ?? '',
  )

  useEffect(() => {
    const qpLoginId = searchParams.get('loginId') ?? ''
    const qpBrowserToken = searchParams.get('browserToken') ?? ''

    if (qpLoginId && qpBrowserToken) {
      setLoginId(qpLoginId)
      setBrowserToken(qpBrowserToken)
      return
    }

    try {
      const storedLoginId = window.sessionStorage.getItem('kyoto_cli_loginId') ?? ''
      const storedBrowserToken =
        window.sessionStorage.getItem('kyoto_cli_browserToken') ?? ''

      if (storedLoginId && storedBrowserToken) {
        setLoginId(storedLoginId)
        setBrowserToken(storedBrowserToken)
      }
    } catch {
      // ignore
    }
  }, [searchParams])

  const canSubmit = Boolean(loginId && browserToken)

  const payload = useMemo(
    () => ({ loginId, browserToken }),
    [loginId, browserToken],
  )

  useEffect(() => {
    if (!canSubmit) {
      setState({ kind: 'error', message: 'Missing login parameters.' })
      return
    }
    if (isPending) return
    if (!session) {
      setState({ kind: 'error', message: 'Not signed in. Please try again.' })
      return
    }

    let cancelled = false
    ;(async () => {
      setState({ kind: 'submitting' })
      const res = await fetch('/api/cli/login/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (cancelled) return
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setState({
          kind: 'error',
          message: `Failed to complete CLI login (${res.status}). ${text}`,
        })
        return
      }

      try {
        window.sessionStorage.removeItem('kyoto_cli_loginId')
        window.sessionStorage.removeItem('kyoto_cli_browserToken')
      } catch {
        // ignore
      }

      setState({ kind: 'done' })
    })()

    return () => {
      cancelled = true
    }
  }, [canSubmit, isPending, payload, session])

  return (
    <main className="container mx-auto min-h-screen py-12">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Kyoto CLI Login</h1>

        {state.kind === 'waiting_for_session' && (
          <p className="text-muted-foreground">
            Finishing sign-in… (waiting for session)
          </p>
        )}

        {state.kind === 'submitting' && (
          <p className="text-muted-foreground">Finishing CLI login…</p>
        )}

        {state.kind === 'done' && (
          <>
            <p className="text-muted-foreground">
              You’re signed in. You can return to your terminal.
            </p>
            <Button
              onClick={() => {
                window.close()
              }}
            >
              Close this tab
            </Button>
          </>
        )}

        {state.kind === 'error' && (
          <div className="rounded-md border p-4 text-sm">
            <p className="font-medium">Could not complete login</p>
            <p className="text-muted-foreground">{state.message}</p>
          </div>
        )}
      </div>
    </main>
  )
}

